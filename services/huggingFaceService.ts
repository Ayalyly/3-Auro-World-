
export class HuggingFaceService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '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';
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async generateTTS(text: string, modelId: string = 'facebook/mms-tts-vie'): Promise<string | null> {
    const maxRetries = 5;
    let currentRetry = 0;
    let waitTime = 3000; // Start with 3 seconds

    while (currentRetry < maxRetries) {
      try {
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${modelId}`,
          {
            headers: { 
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({ inputs: text }),
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          if (blob.type.includes('application/json')) {
              // This is likely a loading message even with 200 OK in some cases, 
              // or an error returned as JSON
              const textData = await blob.text();
              const jsonData = JSON.parse(textData);
              if (jsonData.error && jsonData.error.includes('loading')) {
                  console.log(`Model loading, retry ${currentRetry + 1}/${maxRetries}...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                  currentRetry++;
                  waitTime += 2000;
                  continue;
              }
          }
          
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              const base64 = base64data.split(',')[1];
              resolve(base64);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }

        if (response.status === 503 || response.status === 429) {
          const errorData = await response.json();
          if (errorData.error && errorData.error.includes('loading')) {
            console.log(`Model loading (503), retry ${currentRetry + 1}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            currentRetry++;
            waitTime += 3000;
            continue;
          }
        }

        const errorText = await response.text();
        console.error(`Hugging Face API error (${response.status}):`, errorText);
        return null;

      } catch (error) {
        console.error(`Attempt ${currentRetry + 1} failed:`, error);
        if (currentRetry === maxRetries - 1) return null;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        currentRetry++;
        waitTime += 2000;
      }
    }
    return null;
  }
}
