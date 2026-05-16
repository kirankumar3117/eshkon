require('dotenv').config({ path: '.env.local' });
const { createClient } = require('contentful');

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master'
});

async function listPages() {
  const entries = await client.getEntries({
    content_type: 'page',
    limit: 10
  });
  console.log(`Found ${entries.items.length} pages in Contentful.`);
  entries.items.forEach(e => console.log('Slug:', e.fields.slug));
}

listPages().catch(console.error);
