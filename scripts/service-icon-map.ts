// Hand-curated GCP service prefix -> official icon table (IAM-34). Zero dependencies; consumed by
// scripts/build-service-icons.ts (generator) and the unit test. Paths are relative to vendor/gcp-icons/.
//
// Resolution order for a service prefix (the first segment of a permission, or the `roles/<svc>.` prefix):
//   1. EXACT    an icon of the product itself (core pack preferred, then legacy)
//   2. CATEGORY a domain icon (category pack), via CATEGORY table, then PREFIX_CATEGORY rules
//   3. GENERIC  legacy/cloud_generic.svg
export const GENERIC = 'legacy/cloud_generic.svg';
export const IAM_ICON = 'legacy/identity_and_access_management.svg';

const core = (n: string) => `core/${n}-512-color.svg`;
const rgb = (n: string) => `core/${n}-512-color-rgb.svg`;
const legacy = (n: string) => `legacy/${n}.svg`;
const cat = (n: string) => `category/${n}-512-color.svg`;

const BQ = core('BigQuery');
const GKE = core('GKE');
const ANTHOS = core('Anthos');
const VERTEX = core('VertexAI');
const APIGEE = rgb('Apigee');
const SCC = core('SecurityCommandCenter');
const GCS = core('Cloud_Storage');
const DIST = core('DistributedCloud');
const NETWORKING = 'category/Networking-512-color-rgb.svg';
const SECOPS = rgb('SecOps');
const MEMSTORE = legacy('memorystore');
const GMAPS = legacy('google_maps_platform');
const CCAI = legacy('contact_center_ai');
const DATAPROC = legacy('dataproc');
const TPU = legacy('cloud_tpu');
const ASM = legacy('anthos_service_mesh');
const CLOUDAPIS = legacy('cloud_apis');
const IDPLATFORM = legacy('identity_platform');
const OPS = legacy('cloud_ops');
const TRANSFER = legacy('transfer');
const DATAPOL = legacy('data_loss_prevention_api');
const GAPIGW = legacy('cloud_api_gateway');
const ENDPOINTS = legacy('cloud_endpoints');
const ASSETINV = legacy('cloud_asset_inventory');
const KMS = legacy('key_management_service');
const CATALOG = legacy('data_catalog');
const DOCAI = legacy('document_ai');
const CTR = legacy('container_registry');

/** Services with an exact product icon. */
export const EXACT: Record<string, string> = {
  // Compute, containers
  compute: rgb('ComputeEngine'),
  container: GKE,
  gkehub: GKE,
  gkebackup: GKE,
  gkemulticloud: GKE,
  gkedataplanemanagement: GKE,
  gkeonprem: legacy('gke_on-prem'),
  run: rgb('CloudRun'),
  runapps: rgb('CloudRun'),
  appengine: legacy('app_engine'),
  appengineflex: legacy('app_engine'),
  cloudfunctions: legacy('cloud_functions'),
  batch: legacy('batch'),
  osconfig: legacy('os_configuration_management'),
  tpu: TPU,
  cloudtpu: TPU,
  hypercomputecluster: core('AIHypercomputer'),
  vmwareengine: legacy('vmware_engine'),
  vmmigration: legacy('migrate_for_compute_engine'),
  baremetalsolution: legacy('bare_metal_solutions'),
  gdchardwaremanagement: DIST,
  edgecontainer: DIST,
  edgenetwork: DIST,
  kuberun: legacy('kuberun'),
  anthos: ANTHOS,
  anthosaudit: ANTHOS,
  anthosidentityservice: ANTHOS,
  anthospolicycontroller: ANTHOS,
  anthossupport: ANTHOS,
  anthosconfigmanagement: legacy('anthos_config_management'),
  anthosservicemesh: ASM,
  meshconfig: ASM,
  meshcontrolplane: ASM,
  meshdataplane: ASM,
  containerregistry: CTR,
  artifactregistry: legacy('artifact_registry'),
  cloudbuild: legacy('cloud_build'),
  clouddeploy: legacy('cloud_deploy'),
  // Storage, databases
  storage: GCS,
  storagebatchoperations: GCS,
  storageinsights: GCS,
  storagetransfer: TRANSFER,
  transferappliance: legacy('transfer_appliance'),
  file: legacy('filestore'),
  cloudsql: core('CloudSQL'),
  spanner: core('CloudSpanner'),
  alloydb: core('AlloyDB'),
  bigtable: legacy('bigtable'),
  datastore: legacy('datastore'),
  firestore: legacy('firestore'),
  redis: MEMSTORE,
  memcache: MEMSTORE,
  memorystore: MEMSTORE,
  datamigration: legacy('database_migration_service'),
  // Data and analytics
  bigquery: BQ,
  dataform: BQ, // Dataform is part of BigQuery
  bigqueryconnection: BQ,
  bigquerycontinuousquery: BQ,
  bigquerydatapolicy: BQ,
  bigquerydatatransfer: BQ,
  bigquerymigration: BQ,
  bigqueryomni: BQ,
  bigqueryspark: BQ,
  biglake: BQ,
  analyticshub: legacy('analytics_hub'),
  dataflow: legacy('dataflow'),
  dataproc: DATAPROC,
  dataprocrm: DATAPROC,
  metastore: legacy('dataproc_metastore'),
  dataplex: legacy('dataplex'),
  datacatalog: CATALOG,
  datafusion: legacy('cloud_data_fusion'),
  datastream: legacy('datastream'),
  datalabeling: legacy('data_labeling'),
  dataprep: legacy('dataprep'),
  datastudio: legacy('data_studio'),
  lookerstudio: legacy('data_studio'),
  looker: core('Looker'),
  composer: legacy('cloud_composer'),
  pubsub: legacy('pubsub'),
  pubsublite: legacy('pubsub'),
  eventarc: legacy('eventarc'),
  workflows: legacy('workflows'),
  cloudscheduler: legacy('cloud_scheduler'),
  cloudtasks: legacy('cloud_tasks'),
  connectors: legacy('connectors'),
  genomics: legacy('genomics'),
  lifesciences: legacy('genomics'),
  cloudoptimization: legacy('cloud_optimization_ai'),
  cloudiottoken: legacy('iot_core'),
  serviceconsumermanagement: CLOUDAPIS,
  // AI and ML
  aiplatform: VERTEX,
  visionai: VERTEX, // Vertex AI Vision
  notebooks: VERTEX,
  discoveryengine: VERTEX,
  vectorsearch: VERTEX,
  automl: legacy('automl'),
  automlrecommendations: legacy('recommendations_ai'),
  dialogflow: legacy('dialogflow'),
  contactcenterinsights: CCAI,
  contactcenteraiplatform: CCAI,
  ces: CCAI, // Customer Engagement Suite
  documentai: DOCAI,
  documentaicore: DOCAI,
  speech: legacy('speech-to-text'),
  cloudtranslate: legacy('cloud_translation_api'),
  translationhub: legacy('cloud_translation_api'),
  visualinspection: legacy('visual_inspection'),
  retail: legacy('retail_api'),
  mediaasset: legacy('media_translation_api'),
  healthcare: legacy('cloud_healthcare_api'),
  // Security and identity
  iam: IAM_ICON,
  // Basic and legacy-basic roles (roles/viewer, roles/editor, roles/owner, ...) have no dot-separated service.
  viewer: IAM_ICON,
  editor: IAM_ICON,
  owner: IAM_ICON,
  reader: IAM_ICON,
  writer: IAM_ICON,
  browser: IAM_ICON,
  admin: IAM_ICON,
  iamconnectors: IAM_ICON,
  cloudkms: KMS,
  cloudkmskacls: legacy('key_access_justifications'),
  secretmanager: legacy('secret_manager'),
  certificatemanager: legacy('certificate_manager'),
  privateca: legacy('certificate_authority_service'),
  accesscontextmanager: legacy('access_context_manager'),
  accessapproval: legacy('key_access_justifications'),
  assuredworkloads: legacy('assured_workloads'),
  beyondcorp: legacy('beyondcorp'),
  binaryauthorization: legacy('binary_authorization'),
  iap: legacy('identity-aware_proxy'),
  dlp: DATAPOL,
  securitycenter: SCC,
  securitycentermanagement: SCC,
  containerthreatdetection: SCC,
  threatintelligence: core('ThreatIntelligence'),
  chronicle: SECOPS,
  chroniclesm: SECOPS,
  mandiant: core('Mandiant'),
  recaptchaenterprise: legacy('phishing_protection'),
  websecurityscanner: legacy('web_security_scanner'),
  cloudsecurityscanner: legacy('cloud_security_scanner'),
  managedidentities: legacy('managed_service_for_microsoft_active_directory'),
  identityplatform: IDPLATFORM,
  identitytoolkit: IDPLATFORM,
  workloadidentity: legacy('workload_identity_pool'),
  riskmanager: legacy('risk_manager'),
  ids: legacy('cloud_ids'),
  policyanalyzer: legacy('policy_analyzer'),
  policysimulator: legacy('policy_analyzer'),
  // Networking
  dns: legacy('cloud_dns'),
  networkservices: legacy('cloud_load_balancing'),
  domains: legacy('cloud_domains'),
  networksecurity: legacy('network_security'),
  networkconnectivity: legacy('network_connectivity_center'),
  networkmanagement: legacy('network_intelligence_center'),
  servicedirectory: legacy('service_discovery'),
  trafficdirector: legacy('traffic_director'),
  firewallinsights: legacy('cloud_firewall_rules'),
  // APIs
  apigee: APIGEE,
  apigeeregistry: APIGEE,
  apigeeconnect: APIGEE,
  apihub: legacy('api'),
  apigateway: GAPIGW,
  apigateway_management: GAPIGW,
  endpoints: ENDPOINTS,
  endpointsportal: ENDPOINTS,
  serviceusage: CLOUDAPIS,
  servicemanagement: CLOUDAPIS,
  // Operations, management
  logging: legacy('cloud_logging'),
  monitoring: legacy('cloud_monitoring'),
  opsconfigmonitoring: legacy('cloud_monitoring'),
  observability: OPS,
  cloudtrace: legacy('trace'),
  clouddebugger: legacy('debugger'),
  cloudprofiler: legacy('profiler'),
  errorreporting: legacy('error_reporting'),
  stackdriver: legacy('stackdriver'),
  cloudasset: ASSETINV,
  billing: legacy('billing'),
  resourcemanager: legacy('project'),
  runtimeconfig: legacy('runtime_config'),
  deploymentmanager: legacy('cloud_deployment_manager'),
  clouddeploymentmanager: legacy('cloud_deployment_manager'),
  cloudquotas: legacy('quotas'),
  cloudsupport: legacy('support'),
  // Maps, other
  mapsadmin: GMAPS,
  mapsplatformdatasets: GMAPS,
  mapsanalytics: GMAPS,
  roads: GMAPS,
  routeoptimization: GMAPS,
  navigationconnect: GMAPS,
  fleetengine: legacy('fleet_engine'),
  gameservices: legacy('game_servers'),
  cloudtestservice: legacy('cloud_test_lab'),
  cloudtoolresults: legacy('cloud_test_lab'),
  cloudjobdiscovery: legacy('cloud_jobs_api'),
  cloudiot: legacy('iot_core'),
  marketplacesolutions: legacy('google_cloud_marketplace'),
};

/** Domain fallback for services without a product icon. */
export const CATEGORY: Record<string, string> = {
  // AI and ML
  cloudaicompanion: cat('AIMachineLearning'),
  geminicloudassist: cat('AIMachineLearning'),
  geminicodeassistmanagement: cat('AIMachineLearning'),
  geminidataanalytics: cat('AIMachineLearning'),
  generativelanguage: cat('AIMachineLearning'),
  businessaicode: cat('AIMachineLearning'),
  ml: cat('AIMachineLearning'),
  modelarmor: cat('AIMachineLearning'),
  seclm: cat('AIMachineLearning'),
  aisandbox: cat('AIMachineLearning'),
  aiedgeportal: cat('AIMachineLearning'),
  enterpriseknowledgegraph: cat('AIMachineLearning'),
  speakerid: cat('AIMachineLearning'),
  agentgateway: cat('Agents'),
  agentidentity: cat('Agents'),
  agentregistry: cat('Agents'),
  // Data analytics
  managedkafka: cat('DataAnalytics'),
  managedflink: cat('DataAnalytics'),
  datalineage: cat('DataAnalytics'),
  datapipelines: cat('DataAnalytics'),
  dataprocessing: cat('DataAnalytics'),
  dataconnectors: cat('DataAnalytics'),
  contentwarehouse: cat('DataAnalytics'),
  recommender: cat('DataAnalytics'),
  // Databases
  oracledatabase: cat('Databases'),
  databaseinsights: cat('Databases'),
  databasecenter: cat('Databases'),
  databasesconsole: cat('Databases'),
  redisenterprisecloud: cat('Databases'),
  // Storage
  backupdr: cat('Storage'),
  netapp: cat('Storage'),
  netappcloudvolumes: cat('Storage'),
  'cloudvolumesgcp-api': cat('Storage'),
  lustre: cat('Storage'),
  parallelstore: cat('Storage'),
  cloudonefs: cat('Storage'),
  dellemccloudonefs: cat('Storage'),
  // Networking
  vpcaccess: NETWORKING,
  servicenetworking: NETWORKING,
  networkactions: NETWORKING,
  serviceextensions: NETWORKING,
  cloudnumberregistry: NETWORKING,
  spectrumsas: NETWORKING,
  // Security and identity
  apikeys: cat('SecurityIdentity'),
  parametermanager: cat('ManagementTools'),
  essentialcontacts: cat('ManagementTools'),
  privilegedaccessmanager: cat('SecurityIdentity'),
  cloudsecuritycompliance: cat('SecurityIdentity'),
  auditmanager: cat('SecurityIdentity'),
  compliancescanning: cat('SecurityIdentity'),
  dspm: cat('SecurityIdentity'),
  externalexposure: cat('SecurityIdentity'),
  ciem: cat('SecurityIdentity'),
  cloudcontrolspartner: cat('SecurityIdentity'),
  securedlandingzone: cat('SecurityIdentity'),
  securityposture: cat('SecurityIdentity'),
  assuredoss: cat('SecurityIdentity'),
  fpnv: cat('SecurityIdentity'),
  workloadcertificate: cat('SecurityIdentity'),
  confidentialcomputing: cat('SecurityIdentity'),
  clientauthconfig: cat('SecurityIdentity'),
  oauthconfig: cat('SecurityIdentity'),
  workspacekeyaccess: cat('SecurityIdentity'),
  publicca: cat('SecurityIdentity'),
  riscconfigs: cat('SecurityIdentity'),
  riscconfigurationservice: cat('SecurityIdentity'),
  containersecurity: cat('SecurityIdentity'),
  containerscanning: cat('SecurityIdentity'),
  ondemandscanning: cat('SecurityIdentity'),
  containeranalysis: cat('SecurityIdentity'),
  servicesecurityinsights: cat('SecurityIdentity'),
  policyremediatormanager: cat('SecurityIdentity'),
  // Containers, DevOps, developer tools
  multiclusteringress: cat('Containers'),
  multiclustermetering: cat('Containers'),
  multiclusterservicediscovery: cat('Containers'),
  krmapihosting: cat('Containers'),
  kubernetesmetadata: cat('Containers'),
  configdelivery: cat('Containers'),
  progressiverollout: cat('Containers'),
  securesourcemanager: cat('DevOps'),
  developerconnect: cat('DevOps'),
  sourcerepo: cat('DevOps'),
  source: cat('DevOps'),
  remotebuildexecution: cat('DevOps'),
  workstations: cat('Developer_Tools'),
  appdevelopmentexperience: cat('Developer_Tools'),
  designcenter: cat('Developer_Tools'),
  cloudmigration: cat('Migration'),
  migrationcenter: cat('Migration'),
  rapidmigrationassessment: cat('Migration'),
  // Management, operations
  config: cat('ManagementTools'),
  apphub: cat('ManagementTools'),
  apptopology: cat('ManagementTools'),
  apphubendpoint: cat('ManagementTools'),
  saasservicemgmt: cat('ManagementTools'),
  saasconfig: cat('ManagementTools'),
  workloadmanager: cat('ManagementTools'),
  licensemanager: cat('ManagementTools'),
  maintenance: cat('ManagementTools'),
  orgpolicy: cat('ManagementTools'),
  resourcesettings: cat('ManagementTools'),
  cloudconfig: cat('ManagementTools'),
  cloudhub: cat('ManagementTools'),
  cloudapiregistry: cat('ManagementTools'),
  capacityplanner: cat('ManagementTools'),
  cloudlocationfinder: cat('ManagementTools'),
  advisorynotifications: cat('ManagementTools'),
  cloudnotifications: cat('ManagementTools'),
  appoptimize: cat('ManagementTools'),
  autoscaling: cat('ManagementTools'),
  cloudmessaging: cat('ManagementTools'),
  telemetry: cat('Observability'),
  servicehealth: cat('Operations'),
  faulttesting: cat('Operations'),
  // Media, maps, marketplace, collaboration, web
  livestream: cat('MediaServices'),
  stream: cat('MediaServices'),
  videostitcher: cat('MediaServices'),
  transcoder: cat('MediaServices'),
  earthengine: cat('MapsGeospatial'),
  earth: cat('MapsGeospatial'),
  consumerprocurement: cat('Marketplace'),
  cloudprivatecatalog: cat('Marketplace'),
  cloudprivatecatalogproducer: cat('Marketplace'),
  paymentsresellersubscription: cat('Marketplace'),
  gsuiteaddons: cat('Collaboration'),
  chat: cat('Collaboration'),
  workspacemarketplace: cat('Collaboration'),
  carestudio: cat('Collaboration'),
  blockchainnodeengine: cat('Web3'),
  blockchainvalidatormanager: cat('Web3'),
  universalledger: cat('Web3'),
  androidmanagement: cat('WebMobile'),
  fcmdata: cat('WebMobile'),
  devicerun: cat('WebMobile'),
  devicestreaming: cat('WebMobile'),
  nestconsole: cat('WebMobile'),
  actions: cat('WebMobile'),
  proximitybeacon: cat('MapsGeospatial'),
  // Integration
  integrations: cat('IntegrationServices'),
  apim: cat('IntegrationServices'),
  // Hybrid / telco
  telcoautomation: cat('HybridMulticloud'),
};

/** Prefix rules for families of services (checked in order) when no table entry matches. */
export const PREFIX_CATEGORY: [prefix: string, icon: string][] = [
  ['firebase', cat('WebMobile')],
  ['commerce', cat('Marketplace')],
  ['bigquery', BQ],
  ['gke', GKE],
  ['anthos', ANTHOS],
  ['apigee', APIGEE],
  ['looker', core('Looker')],
  ['maps', GMAPS],
  ['workspace', cat('Collaboration')],
];

export type Tier = 'exact' | 'category' | 'generic';
export interface Resolved {
  file: string;
  tier: Tier;
}

export function resolveServiceIcon(service: string): Resolved {
  const exact = EXACT[service];
  if (exact) return { file: exact, tier: 'exact' };
  const c = CATEGORY[service];
  if (c) return { file: c, tier: 'category' };
  const rule = PREFIX_CATEGORY.find(([p]) => service.startsWith(p));
  if (rule) return { file: rule[1], tier: 'category' };
  return { file: GENERIC, tier: 'generic' };
}

/** Service prefix of a permission ("storage.objects.get" -> "storage") or role ("roles/storage.admin"). */
export function serviceOf(id: string): string {
  return id.replace(/^roles\//, '').split('.')[0] ?? '';
}
