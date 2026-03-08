
export enum Sender {
  USER = 'USER',
  AI = 'AI',
  SYSTEM = 'SYSTEM',
  SHOPKEEPER = 'SHOPKEEPER',
  CHARACTER = 'CHARACTER'
}

export type Mood =
  | 'Hạnh phúc'
  | 'Buồn'
  | 'Giận dữ'
  | 'Ghen tuông'
  | 'Mệt mỏi'
  | 'Nghịch ngợm';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'disabled';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface SocialComment {
  id: string;
  authorName: string;
  avatar: string;
  content: string;
  timestamp: number;
  isUser: boolean;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  avatar: string;
  content: string;
  image?: string;
  likes: number;
  comments: SocialComment[];
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'MENTION';
  actorName: string;
  actorAvatar: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export interface Relation {
  id: string;
  name: string;
  displayName?: string;
  nickname?: string;
  type: 'Gia đình' | 'Công việc' | 'Bạn bè' | 'Sư môn' | 'Kẻ thù' | 'Người lạ' | string;
  avatar: string;
  description: string;

  relationshipLevel: number;
  relationshipStatus: 'Thân thiết' | 'Bình thường' | 'Căng thẳng' | 'Xa cách' | string;

  personalNotes: string;

  lastInteractionTime?: number;
  currentMoodEstimate?: string;
  lastKnownContext?: string;

  lastMessage?: string;
  history?: { sender: 'CHAR' | 'NPC'; text: string; time: string }[];

  affinityWithChar: number;
}

export interface DiaryEntry {
  date: number;
  content: string;
  mood: Mood;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: number;
  image?: string; // Keep for backward compatibility
  images?: string[]; // Support multiple images
  isThinking?: boolean;
  isEdited?: boolean;
  versions?: { text: string; timestamp: number }[];
  currentVersionIndex?: number;
  branchId?: string;
}

export interface Branch {
  id: string;
  name: string;
  note?: string;
  parentId?: string;
  forkMessageId?: string;
  createdAt: number;
  isPinned?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  value: number;
  affinityBonus: number;
  category: string;
  quantity?: number;
  rarity?: 'Thường' | 'Hiếm' | 'Cực hiếm' | 'Huyền thoại' | 'Độc bản';
  // Home Feature Props
  isFurniture?: boolean;
  furnitureType?: 'floor' | 'wall' | 'decor';
  image?: string;
  modelUrl?: string;
  pixelImage?: string;
  interactiveImage?: string; // New: Secondary image for interactive items
  isInteractive?: boolean; // New: Indicates if the item has interactive behavior
  shopType?: 'Furniture' | 'General'; // New: Distinguish between furniture shop and general shop
}

export interface Property {
  id: string;
  name: string;
  type: string;
  location: string;
  value: number;
  image: string;
  description: string;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  date: number;
  relatedItem?: string;
}

export interface OrderHistory {
  id: string;
  date: number;
  items: InventoryItem[];
  total: number;
  shopkeeper?: string;
}

export interface ThemeConfig {
  primaryColor: string;
  chatBg: string;
  userBubbleColor: string;
  aiBubbleColor: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  customIcon?: string; // Base64 or URL for custom app icon
}

export interface ShopNPC {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  personality: string;
  greeting: string;
  location: string;
}

export interface WorldContext {
  currency?: string;
  currencyName?: string;
  shopNPCs?: ShopNPC[];
  shopItems?: InventoryItem[];
  worldDetail?: string;
  worldRules?: string[];
  tone?: string;
  genre?: string;
}

export interface IncomeStream {
  id: string;
  name: string;
  type: 'salary' | 'rental' | 'investment' | 'business' | 'passive';
  amount: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  nextPayment: number;
  isActive: boolean;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextPayment: number;
  isActive: boolean;
}

export interface Job {
  id: string;
  title: string;
  employer: string;
  hourlyRate: number;
  hoursWorked: number;
  lastWorked: number;
}

export interface SideHustle {
  id: string;
  name: string;
  successRate: number;
  minReward: number;
  maxReward: number;
  cooldown: number;
  lastUsed: number;
}

export interface PlacedFurniture {
  id: string;
  itemId: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  modelUrl?: string;
  pixelImage?: string;
  zIndex?: number;
  isFlipped?: boolean;
  interactiveImage?: string; // New: Secondary image for interactive items
  isInteractive?: boolean; // New: Indicates if the item has interactive behavior
  currentImage?: string; // New: To toggle between pixelImage and interactiveImage
}

export interface CardPrivacySettings {
  backstory: boolean;
  personality: boolean;
  greeting: boolean;
  appearance: boolean;
  npcRelations: boolean;
}

export interface Character {
  id?: string;
  name: string;
  avatar: string;
  pixelAvatar?: string;
  description: string;
  prompt?: string;
  appearance?: string;
  openingMessage: string;
  relationshipScore: number;
  initialAffinity?: number;
  youtubeLink?: string;
  maxScore: number;
  status: string;
  hearts: number;
  money: number;
  inventory: InventoryItem[];
  properties: Property[];
  transactions: Transaction[];
  socialPosts: SocialPost[];
  notifications: Notification[];
  mood: Mood;
  behavior: {
    jealousy: number;
    possessiveness: number;
    initiative: number;
    lying: number;
    sarcasm: number;
    romantic: number;
    stoic: number;
  };
  diary: DiaryEntry[];
  relations: Relation[];
  world: WorldContext;
  branches?: Branch[];
  incomeStreams?: IncomeStream[];
  expenses?: Expense[];
  lastIncomeProcessed?: number;
  scale?: number;
  // Home Feature Layouts
  roomLayout?: PlacedFurniture[];
  pixelRoomLayout?: PlacedFurniture[];
  pixelRoomSettings?: {
    walkSpeed?: number;
    autoRemoveBg?: boolean;
    showNames?: boolean;
  };
  outfits?: { id: string; name: string; image: string; }[];
  memories?: Memory[];
  cardConfig?: {
    privacy: CardPrivacySettings;
    rules: string;
    prefix: string;
    includedFields: (keyof CardPrivacySettings)[];
    customText?: string;
    token?: string;
  };
}

export interface UserNPCRelation {
  npcId: string;
  npcName: string;
  npcAvatar: string;
  relationship: string; // e.g., "Bạn bè", "Người yêu cũ", "Chủ nợ"
  relationshipStatus?: string;
  affinity?: number;
  personalNotes?: string;
  history: { sender: 'USER' | 'NPC'; text: string; timestamp: number }[];
  lastInteraction: number;
}

export interface UserProfile {
  name: string;
  avatar: string;
  pixelAvatar?: string;
  description: string;
  appearance?: string;
  money: number;
  auroCoins?: number;
  lastCheckIn?: number;
  scale?: number;
  currencyName: string;
  inventory: InventoryItem[];
  furnitureInventory?: InventoryItem[]; // Separate inventory for furniture
  properties: Property[];
  transactions: Transaction[];
  purchaseHistory: OrderHistory[];
  activeJobs?: Job[];
  sideHustles?: SideHustle[];
  outfits?: { id: string; name: string; image: string; }[];
  quests?: Quest[];
  usedGiftCodes?: string[];
  lastDailyQuestClaim?: number;
  npcRelations?: UserNPCRelation[]; // New: User's personal relationships with NPCs
}

export interface SaveSlot {
  id: string;
  charName: string;
  charAvatar: string;
  userName: string;
  lastPlayed: number;
  level: number;
  isLocalOnly?: boolean;
}

export type AppView =
  | 'chat'
  | 'settings'
  | 'phone'
  | 'user_phone' // New: User's personal phone
  | 'inventory'
  | 'shop'
  | 'setup'
  | 'timeline'
  | 'profile'
  | 'cart'
  | 'history'
  | 'social'
  | 'saves'
  | 'char_create'
  | 'char_card'
  | 'share_card'
  | 'contact_detail'
  | 'home'
  | 'quests'
  | 'memories';

export interface PromptPreset {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export interface ApiKeyData {
  value: string;
  isActive: boolean;
  pausedUntil?: number; // Timestamp when the pause expires
}

export interface ApiProviderConfig {
  provider: 'gemini' | 'claude' | 'chatgpt' | 'deepseek' | 'groq' | 'proxy';
  keys: ApiKeyData[];
  activeModel: string;
  isEnabled: boolean;
  baseUrl?: string;
  model?: string;
}

export interface AppBehaviorSettings {
  npcAutoReply?: boolean;
  npcAutoComment?: boolean;
  enableImageUpload?: boolean;
  enableNSFWFilter?: boolean;
}

export interface AppSettings {
  language?: 'vi' | 'en';
  model: string;
  speed: number;
  responseLength: number | 'short' | 'balanced' | 'long';
  emotionalIntensity: number;
  maxTokens: number;
  temperature?: number;
  thinkingEnabled?: boolean;
  thinkingLevel?: 'LOW' | 'HIGH';
  theme: ThemeConfig;
  systemPrompts?: PromptPreset[];
  prefixes?: PromptPreset[];
  apiConfigs?: ApiProviderConfig[];
  behavior?: AppBehaviorSettings;
  giftCodeSheetUrl?: string;
  unallocatedAuroCoins?: number;
  unallocatedItems?: InventoryItem[];
  usedGiftCodes?: string[];
  shopModel?: string; // New: Model for Shop
  socialModel?: string; // New: Model for Social Network
  worldModel?: string; // New: Model for World Generation
}

export interface AuraExportData {
  meta: {
    version: string;
    timestamp: number;
    platform: 'AuroWorld';
    type: 'FULL' | 'CUSTOM';
  };
  character?: Character;
  user?: UserProfile;
  messages?: Message[];
  settings?: AppSettings;
  worldId?: string;
}

export interface AuroCardData {
  publicId: string;
  name: string;
  avatar: string;
  role: string;
  shortDesc: string;
  context: string;
  createdAt: number;
  fullCharacterData?: Character;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: {
    auroCoins?: number;
    items?: InventoryItem[];
  };
  status: 'locked' | 'active' | 'completed' | 'claimed';
  progress?: number;
  progressMax?: number;
  type: 'daily' | 'weekly' | 'achievement';
}

export interface Memory {
  id: string;
  type: 'message' | 'image' | 'note';
  content: string;
  messageId?: string;
  timestamp: number;
  title?: string; 
  summary?: string; 
  image?: string; 
}

export interface GiftCode {
  code: string;
  rewardCoins: number;
  rewardItemId: string;
  description: string;
}

export interface ExportOptions {
  includeCharacter: boolean;
  chatMode: 'none' | 'current_branch' | 'all';
  includeWorld: boolean;
  includeSystem: boolean;
  includeUser: boolean;
  hideKeys: boolean;
  hideWorldId: boolean;
}
