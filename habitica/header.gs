// A Habitica User Script which does a bunch of different things.
// 
// QuestAutoStart:
//   Start quests automatically when certain conditions are met.
//   Either all active memebers of the party joined the quest
//   or a certain number of hours elapsed since the quest was
//   created.
// 
// QuestAutoInvite:
//   TODO description.
//
// SkillMultiCast:
//   TODO description.
//
// Bank:
//   TODO description.
//
// CostumeChange:
//   TODO description.

// ==========================================
// [Users] Required script data to fill in
// ==========================================
const USER_ID = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
// This is a password, don't share it with anyone.
const API_TOKEN = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
// This needs to be a publicly accessible URL for this script.  To get
// it, click on deploy, click on the gear (settings) icon, click on
// web app, click on permissions and select (anyone), click on deploy.
// Authorize the Web App for your account.  Copy the Web App URL into
// the field below where it says replace_me (make sure to keep single
// quotes around the url).
//
// You'll have to authorize the script to act with your account (yes, this
// should feel scary), there are two permissions the script needs, to run
// whon you're not present.  (so it can respond to requests from Habitica
// through the webhooks interface, and run time delayed triggers to wait
// for things to happen), and to contact external websites.  You can check
// that the only website this script contacts is habitica by searching
// the script for UrlFetchApp and noticing that only habiticaApi calls
// that function and it prepends habitica's API url to every request.
const WEB_APP_URL = 'replace_me';

