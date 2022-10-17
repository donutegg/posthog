import {
    ActionFilter,
    BreakdownKeyType,
    BreakdownType,
    CohortType,
    EntityFilter,
    FilterType,
    FunnelVizType,
    InsightModel,
    InsightShortId,
    InsightType,
    PathType,
    StepOrderValue,
} from '~/types'
import { alphabet, capitalizeFirstLetter, ensureStringIsNotBlank, humanFriendlyNumber, objectsEqual } from 'lib/utils'
import { dashboardLogic } from 'scenes/dashboard/dashboardLogic'
import { savedInsightsLogic } from 'scenes/saved-insights/savedInsightsLogic'
import { keyMapping } from 'lib/components/PropertyKeyInfo'
import api from 'lib/api'
import { getCurrentTeamId } from 'lib/utils/logics'
import { groupsModelType } from '~/models/groupsModelType'
import { toLocalFilters } from './filters/ActionFilter/entityFilterLogic'
import { EVENT_COUNT_PER_ACTOR, RETENTION_FIRST_TIME } from 'lib/constants'
import { retentionOptions } from 'scenes/retention/retentionTableLogic'
import { cohortsModelType } from '~/models/cohortsModelType'
import { mathsLogicType } from 'scenes/trends/mathsLogicType'
import { apiValueToMathType, MathDefinition } from 'scenes/trends/mathsLogic'
import { dashboardsModel } from '~/models/dashboardsModel'
import { insightLogic } from './insightLogic'
import { FormatPropertyValueForDisplayFunction } from '~/models/propertyDefinitionsModel'
import { ReactNode } from 'react'

export const getDisplayNameFromEntityFilter = (
    filter: EntityFilter | ActionFilter | null,
    isCustom = true
): string | null => {
    // Make sure names aren't blank strings
    const customName = ensureStringIsNotBlank(filter?.custom_name)
    let name = ensureStringIsNotBlank(filter?.name)
    if (name && name in keyMapping.event) {
        name = keyMapping.event[name].label
    }

    // Return custom name. If that doesn't exist then the name, then the id, then just null.
    return (isCustom ? customName : null) ?? name ?? (filter?.id ? `${filter?.id}` : null)
}

export function extractObjectDiffKeys(
    oldObj: Partial<FilterType>,
    newObj: Partial<FilterType>,
    prefix: string = ''
): Record<string, any> {
    if (Object.keys(oldObj).length === 0) {
        return []
    }

    let changedKeys: Record<string, any> = {}
    for (const [key, value] of Object.entries(newObj)) {
        const valueOrArray = value || []
        const oldValue = (oldObj as Record<string, any>)[key] || []
        if (!objectsEqual(value, oldValue)) {
            if (key === 'events') {
                if (valueOrArray.length !== oldValue.length) {
                    changedKeys['changed_events_length'] = oldValue?.length
                } else {
                    valueOrArray.forEach((event: Record<string, any>, idx: number) => {
                        changedKeys = {
                            ...changedKeys,
                            ...extractObjectDiffKeys(oldValue[idx], event, `event_${idx}_`),
                        }
                    })
                }
            } else if (key === 'actions') {
                if (valueOrArray.length !== oldValue.length) {
                    changedKeys['changed_actions_length'] = oldValue.length
                } else {
                    valueOrArray.forEach((action: Record<string, any>, idx: number) => {
                        changedKeys = {
                            ...changedKeys,
                            ...extractObjectDiffKeys(oldValue[idx], action, `action_${idx}_`),
                        }
                    })
                }
            } else {
                changedKeys[`changed_${prefix}${key}`] = oldValue
            }
        }
    }

    return changedKeys
}

export function findInsightFromMountedLogic(
    insightShortId: InsightShortId | string,
    dashboardId: number | undefined
): Partial<InsightModel> | null {
    if (dashboardId) {
        const insightOnDashboard = dashboardLogic
            .findMounted({ id: dashboardId })
            ?.values.insightTiles?.find((tile) => tile.insight?.short_id === insightShortId)?.insight
        if (insightOnDashboard) {
            return insightOnDashboard
        } else {
            const dashboards = dashboardsModel.findMounted()?.values.rawDashboards
            let foundOnModel: Partial<InsightModel> | undefined
            for (const dashModelId of Object.keys(dashboards || {})) {
                foundOnModel = dashboardLogic
                    .findMounted({ id: parseInt(dashModelId) })
                    ?.values.insightTiles?.find((tile) => tile.insight?.short_id === insightShortId)?.insight
            }
            return foundOnModel || null
        }
    } else {
        return (
            savedInsightsLogic
                .findMounted()
                ?.values.insights?.results?.find((item) => item.short_id === insightShortId) || null
        )
    }
}

export async function getInsightId(shortId: InsightShortId): Promise<number | undefined> {
    const insightId = insightLogic.findMounted({ dashboardItemId: shortId })?.values?.insight?.id

    return insightId
        ? insightId
        : (await api.get(`api/projects/${getCurrentTeamId()}/insights/?short_id=${encodeURIComponent(shortId)}`))
              .results[0]?.id
}

export function humanizePathsEventTypes(filters: Partial<FilterType>): string[] {
    let humanEventTypes: string[] = []
    if (filters.include_event_types) {
        let matchCount = 0
        if (filters.include_event_types.includes(PathType.PageView)) {
            humanEventTypes.push('page views')
            matchCount++
        }
        if (filters.include_event_types.includes(PathType.Screen)) {
            humanEventTypes.push('screen views')
            matchCount++
        }
        if (filters.include_event_types.includes(PathType.CustomEvent)) {
            humanEventTypes.push('custom events')
            matchCount++
        }
        if (matchCount === 0 || matchCount === Object.keys(PathType).length) {
            humanEventTypes = ['all events']
        }
    }
    return humanEventTypes
}

export function summarizeBreakdown(
    filters: Partial<FilterType>,
    aggregationLabel: groupsModelType['values']['aggregationLabel'],
    cohortsById: cohortsModelType['values']['cohortsById']
): string | null {
    const { breakdown_type, breakdown, breakdown_group_type_index } = filters
    if (breakdown) {
        if (breakdown_type === 'cohort') {
            const cohortIds = breakdown as (number | string)[]
            return `cohorts: ${cohortIds
                .map(
                    (cohortId) =>
                        cohortId &&
                        (cohortId === 'all'
                            ? 'all users'
                            : cohortId in cohortsById
                            ? cohortsById[cohortId]?.name
                            : `ID ${cohortId}`)
                )
                .join(', ')}`
        } else {
            const noun =
                breakdown_type !== 'group'
                    ? breakdown_type
                    : aggregationLabel(breakdown_group_type_index, true).singular
            return `${noun}'s ${
                (breakdown as string) in keyMapping.event ? keyMapping.event[breakdown as string].label : breakdown
            }`
        }
    }
    return null
}

export function summarizeInsightFilters(
    filters: Partial<FilterType>,
    aggregationLabel: groupsModelType['values']['aggregationLabel'],
    cohortsById: cohortsModelType['values']['cohortsById'],
    mathDefinitions: mathsLogicType['values']['mathDefinitions']
): string {
    const insightType = filters.insight
    let summary: string
    switch (insightType) {
        case InsightType.RETENTION:
            const areTargetAndReturningIdentical =
                filters.returning_entity?.id === filters.target_entity?.id &&
                filters.returning_entity?.type === filters.target_entity?.type
            summary =
                `Retention of ${aggregationLabel(filters.aggregation_group_type_index, true).plural}` +
                ` based on doing ${getDisplayNameFromEntityFilter((filters.target_entity || {}) as EntityFilter)}` +
                ` ${retentionOptions[filters.retention_type || RETENTION_FIRST_TIME]} and returning with ` +
                (areTargetAndReturningIdentical
                    ? 'the same event'
                    : getDisplayNameFromEntityFilter((filters.returning_entity || {}) as EntityFilter))
            break
        case InsightType.PATHS:
            // Sync format with PathsSummary in InsightDetails
            summary = `User paths based on ${humanizePathsEventTypes(filters).join(' and ')}`
            if (filters.start_point) {
                summary += ` starting at ${filters.start_point}`
            }
            if (filters.end_point) {
                summary += `${filters.start_point ? ' and' : ''} ending at ${filters.end_point}`
            }
            break
        default:
            const localFilters = toLocalFilters(filters)
            switch (insightType) {
                case InsightType.LIFECYCLE:
                    summary = `User lifecycle based on ${getDisplayNameFromEntityFilter(localFilters[0])}`
                    break
                case InsightType.FUNNELS:
                    const linkSymbol =
                        filters.funnel_order_type === StepOrderValue.STRICT
                            ? '⇉'
                            : filters.funnel_order_type === StepOrderValue.UNORDERED
                            ? '&'
                            : '→'
                    summary = `${localFilters
                        .map((filter) => getDisplayNameFromEntityFilter(filter))
                        .join(` ${linkSymbol} `)} ${
                        aggregationLabel(filters.aggregation_group_type_index, true).singular
                    } conversion`
                    if (filters.funnel_viz_type === FunnelVizType.TimeToConvert) {
                        summary += ' time'
                    } else if (filters.funnel_viz_type === FunnelVizType.Trends) {
                        summary += ' trend'
                    } else {
                        // Steps are the default viz type
                        summary += ' rate'
                    }
                    if (filters.breakdown_type) {
                        summary += ` by ${summarizeBreakdown(filters, aggregationLabel, cohortsById)}`
                    }
                    break
                case InsightType.STICKINESS:
                    summary = capitalizeFirstLetter(
                        localFilters
                            .map((localFilter) => {
                                const actor = aggregationLabel(
                                    localFilter.math === 'unique_group' ? localFilter.math_group_type_index : null,
                                    true
                                ).singular
                                return `${actor} stickiness based on ${getDisplayNameFromEntityFilter(localFilter)}`
                            })
                            .join(' & ')
                    )
                    break
                default:
                    // Trends are the default type
                    summary = localFilters
                        .map((localFilter, localFilterIndex) => {
                            const mathType = apiValueToMathType(localFilter.math, localFilter.math_group_type_index)
                            const mathDefinition = mathDefinitions[mathType] as MathDefinition | undefined
                            const propertyMath: string =
                                mathDefinition?.onProperty &&
                                localFilter.math_property &&
                                localFilter.math_property !== EVENT_COUNT_PER_ACTOR
                                    ? `'s ${
                                          keyMapping.event[localFilter.math_property]?.label ||
                                          localFilter.math_property
                                      }`
                                    : ''
                            let series: string
                            if (localFilter.math && localFilter.math_property === EVENT_COUNT_PER_ACTOR) {
                                series = `${capitalizeFirstLetter(
                                    mathDefinition
                                        ? mathDefinition.shortName
                                        : localFilter.math === 'unique_group'
                                        ? 'unique groups'
                                        : mathType
                                )} ${getDisplayNameFromEntityFilter(localFilter)}${propertyMath} count per user`
                            } else {
                                series = `${getDisplayNameFromEntityFilter(localFilter)}${propertyMath} ${
                                    mathDefinition
                                        ? mathDefinition.shortName
                                        : localFilter.math === 'unique_group'
                                        ? 'unique groups'
                                        : mathType
                                }`
                            }
                            if (filters.formula) {
                                series = `${alphabet[localFilterIndex].toUpperCase()}. ${series}`
                            }
                            return series
                        })
                        .join(' & ')
                    if (filters.breakdown_type) {
                        summary += `${localFilters.length > 1 ? ',' : ''} by ${summarizeBreakdown(
                            filters,
                            aggregationLabel,
                            cohortsById
                        )}`
                    }
                    if (filters.formula) {
                        summary = `${filters.formula} on ${summary}`
                    }
                    break
            }
    }
    return summary
}

export function formatAggregationValue(
    property: string | undefined,
    propertyValue: number | null,
    renderCount: (value: number) => ReactNode = (x) => <>{humanFriendlyNumber(x)}</>,
    formatPropertyValueForDisplay?: FormatPropertyValueForDisplayFunction
): ReactNode {
    if (propertyValue === null) {
        return '-'
    }

    let formattedValue: ReactNode
    if (property && formatPropertyValueForDisplay) {
        formattedValue = formatPropertyValueForDisplay(property, propertyValue)
        // yes, double equals not triple equals  ¯\_(ツ)_/¯ let JS compare strings and numbers however it wants
        if (formattedValue == propertyValue) {
            // formatPropertyValueForDisplay didn't change the value...
            formattedValue = renderCount(propertyValue)
        }
    } else {
        formattedValue = renderCount(propertyValue)
    }

    // Since `propertyValue` is a number. `formatPropertyValueForDisplay` will only return a string
    // To make typescript happy we handle the possible but impossible string array inside this function
    return Array.isArray(formattedValue) ? formattedValue[0] : formattedValue
}

export function formatBreakdownLabel(
    cohorts: CohortType[] | undefined,
    formatPropertyValueForDisplay: FormatPropertyValueForDisplayFunction | undefined,
    breakdown_value: BreakdownKeyType | undefined,
    breakdown: BreakdownKeyType | undefined,
    breakdown_type: BreakdownType | null | undefined,
    isHistogram?: boolean
): string {
    if (isHistogram && typeof breakdown_value === 'string') {
        const [bucketStart, bucketEnd] = JSON.parse(breakdown_value)
        const formattedBucketStart = formatBreakdownLabel(
            cohorts,
            formatPropertyValueForDisplay,
            bucketStart,
            breakdown,
            breakdown_type
        )
        const formattedBucketEnd = formatBreakdownLabel(
            cohorts,
            formatPropertyValueForDisplay,
            bucketEnd,
            breakdown,
            breakdown_type
        )
        return `${formattedBucketStart} – ${formattedBucketEnd}`
    }
    if (breakdown_type === 'cohort') {
        // :TRICKY: Different endpoints represent the all users cohort breakdown differently
        if (breakdown_value === 0 || breakdown_value === 'all') {
            return 'All Users'
        }
        return cohorts?.filter((c) => c.id == breakdown_value)[0]?.name ?? (breakdown_value || '').toString()
    } else if (typeof breakdown_value == 'number') {
        return formatPropertyValueForDisplay
            ? formatPropertyValueForDisplay(breakdown, breakdown_value)?.toString() ?? 'None'
            : breakdown_value.toString()
    } else if (typeof breakdown_value == 'string') {
        return breakdown_value === 'nan' ? 'Other' : breakdown_value === '' ? 'None' : breakdown_value
    } else if (Array.isArray(breakdown_value)) {
        return breakdown_value.join('::')
    } else {
        return ''
    }
}
