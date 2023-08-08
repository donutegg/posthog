import { SceneExport } from 'scenes/sceneTypes'
import { PageHeader } from 'lib/components/PageHeader'
import { useActions, useValues } from 'kea'
import { BatchExportsEditLogicProps, batchExportsEditLogic } from './batchExportEditLogic'
import { LemonSkeleton } from 'lib/lemon-ui/LemonSkeleton'
import { Field } from 'lib/forms/Field'
import { LemonButton, LemonDivider, LemonInput, LemonSelect } from '@posthog/lemon-ui'
import { Form } from 'kea-forms'
import { LemonCalendarSelectInput } from 'lib/lemon-ui/LemonCalendar/LemonCalendarSelect'
import { IconInfo } from 'lib/lemon-ui/icons'

export const scene: SceneExport = {
    component: BatchExportsEditScene,
    logic: batchExportsEditLogic,
    paramsToProps: ({ params: { id } }: { params: { id?: string } }): BatchExportsEditLogicProps => ({
        id: id ?? 'new',
    }),
}

export function BatchExportsEditScene(): JSX.Element {
    const { isNew, batchExportConfigForm, isBatchExportConfigFormSubmitting, batchExportConfigLoading } =
        useValues(batchExportsEditLogic)
    const { submitBatchExportConfigForm, cancelEditing } = useActions(batchExportsEditLogic)

    return (
        <>
            <PageHeader title={`${isNew ? 'New' : 'Edit'} Batch Export`} />

            <div className="my-8" />

            {batchExportConfigLoading ? (
                <>
                    <LemonSkeleton />
                    <LemonSkeleton />
                    <LemonSkeleton />
                    <LemonSkeleton />
                </>
            ) : (
                <>
                    <Form logic={batchExportsEditLogic} formKey="batchExportConfigForm" className="space-y-4">
                        <div className="space-y-4 max-w-200">
                            <Field name="name" label="Name">
                                <LemonInput placeholder="Name your workflow for future reference" />
                            </Field>

                            <div className="flex gap-2 items-start flex-wrap">
                                <Field name="interval" label="Frequency" className="flex-1">
                                    <LemonSelect
                                        options={[
                                            { value: 'hour', label: 'Hourly' },
                                            { value: 'day', label: 'Daily' },
                                        ]}
                                    />
                                </Field>
                                <Field
                                    name="start_at"
                                    label="Start Date"
                                    className="flex-1"
                                    info={
                                        <>
                                            The date from which data is to be exported. Leaving it unset implies that
                                            data exports start from the next period as given by the frequency.
                                        </>
                                    }
                                >
                                    {({ value, onChange }) => (
                                        <LemonCalendarSelectInput
                                            value={value}
                                            onChange={onChange}
                                            placeholder="Select start date (optional)"
                                        />
                                    )}
                                </Field>

                                <Field
                                    name="end_at"
                                    label="End date"
                                    className="flex-1"
                                    info={
                                        <>
                                            The date up to which data is to be exported. Leaving it unset implies that
                                            data exports will continue forever until this export is paused or deleted.
                                        </>
                                    }
                                >
                                    {({ value, onChange }) => (
                                        <LemonCalendarSelectInput
                                            value={value}
                                            onChange={onChange}
                                            placeholder="Select end date (optional)"
                                        />
                                    )}
                                </Field>
                            </div>
                        </div>

                        <div className="flex gap-2 items-start flex-wrap">
                            <div className="space-y-4 max-w-200 w-full shrink-0">
                                <LemonDivider />
                                <Field name="destination" label="Destination">
                                    <LemonSelect
                                        options={[
                                            { value: 'S3', label: 'S3' },
                                            { value: 'Snowflake', label: 'Snowflake' },
                                        ]}
                                    />
                                </Field>

                                {!batchExportConfigForm.destination ? (
                                    <p className="text-muted-alt italic">
                                        Select a destination to continue configuring
                                    </p>
                                ) : batchExportConfigForm.destination === 'S3' ? (
                                    <>
                                        <div className="flex gap-4">
                                            <Field name="bucket_name" label="Bucket" className="flex-1">
                                                <LemonInput placeholder="e.g. my-bucket" />
                                            </Field>
                                            <Field name="region" label="Region" className="flex-1">
                                                <LemonSelect
                                                    options={[
                                                        { value: 'us-east-1', label: 'US East (N. Virginia)' },
                                                        { value: 'us-east-2', label: 'US East (Ohio)' },
                                                        { value: 'us-west-1', label: 'US West (N. California)' },
                                                        { value: 'us-west-2', label: 'US West (Oregon)' },
                                                        { value: 'af-south-1', label: 'Africa (Cape Town)' },
                                                        { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong)' },
                                                        { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
                                                        {
                                                            value: 'ap-northeast-3',
                                                            label: 'Asia Pacific (Osaka-Local)',
                                                        },
                                                        { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
                                                        { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
                                                        { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
                                                        { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
                                                        { value: 'ca-central-1', label: 'Canada (Central)' },
                                                        { value: 'cn-north-1', label: 'China (Beijing)' },
                                                        { value: 'cn-northwest-1', label: 'China (Ningxia)' },
                                                        { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
                                                        { value: 'eu-west-1', label: 'Europe (Ireland)' },
                                                        { value: 'eu-west-2', label: 'Europe (London)' },
                                                        { value: 'eu-south-1', label: 'Europe (Milan)' },
                                                        { value: 'eu-west-3', label: 'Europe (Paris)' },
                                                        { value: 'eu-north-1', label: 'Europe (Stockholm)' },
                                                        { value: 'me-south-1', label: 'Middle East (Bahrain)' },
                                                        { value: 'sa-east-1', label: 'South America (São Paulo)' },
                                                    ]}
                                                />
                                            </Field>
                                        </div>
                                        <Field name="prefix" label="Key prefix">
                                            <LemonInput placeholder="e.g. posthog-events/" />
                                        </Field>
                                        <div className="flex gap-4">
                                            <Field
                                                name="aws_access_key_id"
                                                label="AWS Access Key ID"
                                                className="flex-1"
                                            >
                                                <LemonInput placeholder="e.g. AKIAIOSFODNN7EXAMPLE" />
                                            </Field>
                                            <Field
                                                name="aws_secret_access_key"
                                                label="AWS Secret Access Key"
                                                className="flex-1"
                                            >
                                                <LemonInput placeholder="secret-key" type="password" />
                                            </Field>
                                        </div>
                                    </>
                                ) : batchExportConfigForm.destination === 'Snowflake' ? (
                                    <>
                                        <Field name="user" label="User">
                                            <LemonInput placeholder="my-user" />
                                        </Field>

                                        <Field name="password" label="Password">
                                            <LemonInput placeholder="my-password" type="password" />
                                        </Field>

                                        <Field name="account" label="Account">
                                            <LemonInput placeholder="my-account" />
                                        </Field>

                                        <Field name="database" label="Database">
                                            <LemonInput placeholder="my-database" />
                                        </Field>

                                        <Field name="warehouse" label="Warehouse">
                                            <LemonInput placeholder="my-warehouse" />
                                        </Field>

                                        <Field name="schema" label="Schema">
                                            <LemonInput placeholder="my-schema" />
                                        </Field>

                                        <Field name="table_name" label="Table name">
                                            <LemonInput placeholder="events" />
                                        </Field>

                                        <Field name="role" label="Role" showOptional>
                                            <LemonInput placeholder="my-role" />
                                        </Field>
                                    </>
                                ) : null}
                            </div>

                            <div className="border rounded mt-14 mx-6 flex-1 p-4">
                                <h2>
                                    <IconInfo /> About {batchExportConfigForm.destination} batch exports
                                </h2>
                                <p> Batch exports will blah blah</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <LemonButton
                                data-attr="cancel-batch-export"
                                type="secondary"
                                onClick={() => cancelEditing()}
                                disabledReason={isBatchExportConfigFormSubmitting ? 'Currently being saved' : undefined}
                            >
                                Cancel
                            </LemonButton>
                            <LemonButton
                                data-attr="save-batch-export"
                                htmlType="submit"
                                type="primary"
                                onClick={submitBatchExportConfigForm}
                                loading={isBatchExportConfigFormSubmitting}
                            >
                                {isNew ? 'Create' : 'Save'}
                            </LemonButton>
                        </div>
                    </Form>
                </>
            )}
        </>
    )
}
