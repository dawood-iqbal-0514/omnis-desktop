const LINKEDIN_INTENT_PROMPT = `Analyze the user's LinkedIn-related request.

Available LinkedIn actions:
- sendMessage: Send a direct message to a connection
  - params: recipient (name/profileUrl), message (text)
- sendConnectionRequest: Send a connection request
  - params: targetName, profileUrl (optional), note (optional)
- likePost: Like a post
  - params: postUrl or postId
- commentOnPost: Comment on a post
  - params: postUrl, comment (text)
- viewProfile: View someone's profile
  - params: profileUrl or name

Extract intent and respond with JSON:
{
  "action": "actionName",
  "params": {},
  "confidence": 0.0-1.0,
  "clarificationNeeded": "question to ask if params are missing"
}`;

const NOTION_INTENT_PROMPT = `Analyze the user's Notion-related request.

Available Notion actions:
- createPage: Create a new page
  - params: databaseId, title, properties
- updatePage: Update an existing page
  - params: pageId, properties
- queryDatabase: Query a database
  - params: databaseId, filter, sorts
- addBlock: Add content block
  - params: pageId, content, type

Extract intent and respond with JSON:
{
  "action": "actionName",
  "params": {},
  "confidence": 0.0-1.0,
  "clarificationNeeded": "question to ask if params are missing"
}`;

const HUBSPOT_INTENT_PROMPT = `Analyze the user's HubSpot-related request.

Available HubSpot actions:
- createContact: Create new contact
  - params: email, firstName, lastName, company
- updateContact: Update contact
  - params: contactId, properties
- getContact: Find contact
  - params: email
- createDeal: Create deal
  - params: dealName, amount, stage
- addNote: Add note
  - params: objectType, objectId, note

Extract intent and respond with JSON.`;

const UPWORK_INTENT_PROMPT = `Analyze the user's Upwork-related request.

Available Upwork actions:
- searchJobs: Search for jobs
  - params: query, category, experienceLevel
- applyToJob: Apply to job
  - params: jobUrl, coverLetter, rate
- sendProposal: Send proposal
  - params: jobUrl, proposal, rate
- viewJob: View job details
  - params: jobUrl

Extract intent and respond with JSON.`;

module.exports = {
  LINKEDIN_INTENT_PROMPT,
  NOTION_INTENT_PROMPT,
  HUBSPOT_INTENT_PROMPT,
  UPWORK_INTENT_PROMPT,
};
