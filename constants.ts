export const PROXY_PRESETS = [
    {
      name: 'OpenRouter (Gemini 2.0 Flash Free)',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'google/gemini-2.0-flash-exp:free'
    },
    {
      name: 'OpenRouter (DeepSeek V3)',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'deepseek/deepseek-chat'
    },
    {
      name: 'CosmosRP 2.5 (Standard)',
      baseUrl: 'https://api.pawan.krd/cosmosrp-2.5/v1/chat/completions',
      model: 'cosmosrp-2.5'
    },
    {
      name: 'CosmosRP 2.5 (Instructed)',
      baseUrl: 'https://api.pawan.krd/cosmosrp-2.5-it/v1/chat/completions',
      model: 'cosmosrp-2.5'
    },
    {
      name: 'CosmosRP 2.1 (Standard)',
      baseUrl: 'https://api.pawan.krd/cosmosrp-2.1/v1/chat/completions',
      model: 'cosmosrp-2.1'
    },
    {
      name: 'CosmosRP 2.1 (Instructed)',
      baseUrl: 'https://api.pawan.krd/cosmosrp-2.1-it/v1/chat/completions',
      model: 'cosmosrp-2.1'
    },
    {
      name: 'CosmosRP (Generic - GPT 3.5)',
      baseUrl: 'https://api.pawan.krd/cosmosrp/v1/chat/completions',
      model: 'gpt-3.5-turbo'
    },
    {
      name: 'CosmosRP (Generic - GPT 4)',
      baseUrl: 'https://api.pawan.krd/cosmosrp/v1/chat/completions',
      model: 'gpt-4'
    }
];
