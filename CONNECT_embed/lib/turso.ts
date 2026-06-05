import { createClient } from '@libsql/client';

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://scout-enrichment-bluejaxllc.aws-us-east-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
});

export default turso;
