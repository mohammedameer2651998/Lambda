const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Create Secrets Manager client
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Cache for secrets (avoid calling AWS on every request)
let cachedSecrets = null;

/**
 * Fetch secrets from AWS Secrets Manager
 * Uses caching to avoid repeated API calls
 */
const getSecrets = async () => {
  // Return cached secrets if available
  if (cachedSecrets) {
    console.log('Using cached secrets');
    return cachedSecrets;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.AWS_SECRET_NAME || 'microservice/secrets',
    });

    const response = await client.send(command);
    
    // Parse the secret string (it's JSON)
    cachedSecrets = JSON.parse(response.SecretString);
    console.log('✅ Secrets fetched from AWS Secrets Manager');
    
    return cachedSecrets;
  } catch (error) {
    console.error('❌ Error fetching secrets:', error.name, '-', error.message);
    throw error;
  }
};

/**
 * Get a specific secret value by key
 */
const getSecret = async (key) => {
  const secrets = await getSecrets();
  return secrets[key];
};

/**
 * Clear the cache (useful for secret rotation)
 */
const clearSecretsCache = () => {
  cachedSecrets = null;
  console.log('Secrets cache cleared');
};

module.exports = { getSecrets, getSecret, clearSecretsCache };