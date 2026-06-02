export class AIProcessor {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async capitalizeItemName(name: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a text formatter. Capitalize the first letter of each word in the given text. Return only the capitalized text without any explanation.',
            },
            {
              role: 'user',
              content: name,
            },
          ],
          temperature: 0.3,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        throw new Error('AI API request failed');
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || name;
    } catch (error) {
      console.error('AI processing error:', error);
      // Fallback to simple capitalization
      return this.simpleCapitalize(name);
    }
  }

  private simpleCapitalize(text: string): string {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async processItemNames(names: string[]): Promise<string[]> {
    const processed: string[] = [];
    const nameCount = new Map<string, number>();

    for (const name of names) {
      let capitalizedName = await this.capitalizeItemName(name);
      
      // Handle duplicates by adding a period
      const count = nameCount.get(capitalizedName) || 0;
      nameCount.set(capitalizedName, count + 1);

      if (count > 0) {
        capitalizedName += '.'.repeat(count);
      }

      processed.push(capitalizedName);
    }

    return processed;
  }
}