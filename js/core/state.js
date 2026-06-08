let model, webcam;
let isCameraReady = false;
let isScanning = false;
let autoMode = false;
let prevFrameData = null;
let motionTimer = null;
let lastAutoScan = 0;
let motionPct = 0;
let motionDetected = false;
let popupTimer = null;
let predBuffer = [];
let lastScanMs = 0;
let loopTick = 0;

let totalPoints = 0;
let currentStreak = 0;
let lastScanTime = 0;
let totalTrash = 0;
let scanHistory = [];
let currentTab = "voucher";
let pendingReward = null;
let voices = [];

const stats = {};
Object.keys(TRASH_DICT).forEach(k => (stats[k] = 0));
