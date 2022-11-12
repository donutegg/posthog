import { Scene } from 'scenes/sceneTypes'
import { preloadedScenes } from 'scenes/scenes'

export const appScenes: Record<Scene, () => any> = {
    [Scene.Error404]: () => ({ default: preloadedScenes[Scene.Error404].component }),
    [Scene.ErrorNetwork]: () => ({ default: preloadedScenes[Scene.ErrorNetwork].component }),
    [Scene.ErrorProjectUnavailable]: () => ({ default: preloadedScenes[Scene.ErrorProjectUnavailable].component }),
    [Scene.Dashboards]: () => import('./dashboard/dashboards/Dashboards'),
    [Scene.Dashboard]: () => import('./dashboard/Dashboard'),
    [Scene.Insight]: () => import('./insights/InsightScene'),
    [Scene.Cohorts]: () => import('./cohorts/Cohorts'),
    [Scene.Cohort]: () => import('./cohorts/Cohort'),
    [Scene.DataManagement]: () => import('./data-management/events/EventDefinitionsTable'),
    [Scene.Events]: () => import('./events/Events'),
    [Scene.Actions]: () => import('./actions/ActionsTable'),
    [Scene.EventDefinitions]: () => import('./data-management/events/EventDefinitionsTable'),
    [Scene.EventDefinition]: () => import('./data-management/definition/DefinitionView'),
    [Scene.EventPropertyDefinitions]: () => import('./data-management/event-properties/EventPropertyDefinitionsTable'),
    [Scene.EventPropertyDefinition]: () => import('./data-management/definition/DefinitionView'),
    [Scene.WebPerformance]: () => import('./performance/WebPerformance'),
    [Scene.SessionRecordings]: () => import('./session-recordings/SessionRecordings'),
    [Scene.SessionRecording]: () => import('./session-recordings/detail/SessionRecordingDetail'),
    [Scene.SessionRecordingPlaylist]: () => import('./session-recordings/playlist/SessionRecordingsPlaylist'),
    [Scene.Person]: () => import('./persons/Person'),
    [Scene.Persons]: () => import('./persons/Persons'),
    [Scene.Groups]: () => import('./groups/Groups'),
    [Scene.Group]: () => import('./groups/Group'),
    [Scene.Action]: () => import('./actions/Action'), // TODO
    [Scene.Experiments]: () => import('./experiments/Experiments'),
    [Scene.Experiment]: () => import('./experiments/Experiment'),
    [Scene.FeatureFlags]: () => import('./feature-flags/FeatureFlags'),
    [Scene.FeatureFlag]: () => import('./feature-flags/FeatureFlag'),
    [Scene.OrganizationSettings]: () => import('./organization/Settings'),
    [Scene.OrganizationCreateFirst]: () => import('./organization/Create'),
    [Scene.OrganizationCreationConfirm]: () => import('./organization/ConfirmOrganization/ConfirmOrganization'),
    [Scene.ProjectHomepage]: () => import('./project-homepage/ProjectHomepage'),
    [Scene.ProjectSettings]: () => import('./project/Settings'),
    [Scene.ProjectCreateFirst]: () => import('./project/Create'),
    [Scene.SystemStatus]: () => import('./instance/SystemStatus'),
    [Scene.ToolbarLaunch]: () => import('./toolbar-launch/ToolbarLaunch'),
    [Scene.Licenses]: () => import('./instance/Licenses'),
    [Scene.AsyncMigrations]: () => import('./instance/AsyncMigrations/AsyncMigrations'),
    [Scene.DeadLetterQueue]: () => import('./instance/DeadLetterQueue/DeadLetterQueue'),
    [Scene.MySettings]: () => import('./me/Settings'),
    [Scene.Annotations]: () => import('./annotations/Annotations'),
    [Scene.PreflightCheck]: () => import('./PreflightCheck/PreflightCheck'),
    [Scene.Signup]: () => import('./authentication/Signup'),
    [Scene.InviteSignup]: () => import('./authentication/InviteSignup'),
    [Scene.Ingestion]: () => import('./ingestion/IngestionWizard'),
    [Scene.Billing]: () => import('./billing/Billing'),
    [Scene.BillingSubscribed]: () => import('./billing/BillingSubscribed'),
    [Scene.BillingLocked]: () => import('./billing/BillingLocked'),
    [Scene.Plugins]: () => import('./plugins/Plugins'),
    [Scene.FrontendAppScene]: () => import('./apps/FrontendAppScene'),
    [Scene.AppMetrics]: () => import('./apps/AppMetricsScene'),
    [Scene.Login]: () => import('./authentication/Login'),
    [Scene.SavedInsights]: () => import('./saved-insights/SavedInsights'),
    [Scene.PasswordReset]: () => import('./authentication/PasswordReset'),
    [Scene.PasswordResetComplete]: () => import('./authentication/PasswordResetComplete'),
    [Scene.Unsubscribe]: () => import('./Unsubscribe/Unsubscribe'),
    [Scene.IntegrationsRedirect]: () => import('./IntegrationsRedirect/IntegrationsRedirect'),
    [Scene.IngestionWarnings]: () => import('./data-management/ingestion-warnings/IngestionWarningsView'),
}
