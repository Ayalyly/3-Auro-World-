import { Character, InventoryItem, Message } from '../types';

export interface AffectionResult {
  scoreChange: number;
  reason?: string;
  notification?: string;
}

export class AffectionManager {
  /**
   * Calculates the affection change based on the AI's response tag.
   * This is the primary method driven by the AI's understanding of context.
   */
  public static parseAffectionTag(aiResponseText: string): number {
    const match = aiResponseText.match(/\[AFFECTION:\s*([+-]?\d+)\]/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  }

  /**
   * Cleans the affection tag from the AI response text so the user doesn't see it.
   */
  public static cleanAffectionTag(text: string): string {
    return text.replace(/\[AFFECTION:\s*[+-]?\d+\]/gi, "").trim();
  }

  /**
   * Calculates affection bonus from gifts.
   * This can be used in conjunction with AI evaluation or as a fallback.
   * Currently, the AI evaluates the gift context, so this might be redundant 
   * if we rely solely on AI, but good for hard-coded bonuses.
   */
  public static calculateGiftAffection(item: InventoryItem, character: Character): number {
    // Base bonus from item
    let bonus = item.affinityBonus || 0;

    // TODO: Add logic for character preferences (e.g., if character likes 'Sweet', and item is 'Cake')
    // This would require adding 'preferences' to Character and 'tags' to InventoryItem.
    
    return bonus;
  }

  /**
   * Updates the character's relationship score.
   * Clamps the score between 0 and maxScore.
   */
  public static updateScore(character: Character, change: number): Character {
    let currentScore = character.relationshipScore || 0;
    const maxScore = character.maxScore || 100;

    currentScore += change;
    currentScore = Math.max(0, Math.min(currentScore, maxScore));

    return {
      ...character,
      relationshipScore: currentScore
    };
  }

  /**
   * Generates a notification message based on the score change.
   */
  public static getNotificationMessage(characterName: string, change: number): string | null {
    if (change === 0) return null;

    const sign = change > 0 ? '+' : '';
    const emotion = change > 0 ? 'vui vẻ' : 'không vui';
    
    return `${characterName} cảm thấy ${emotion}. (Hảo cảm ${sign}${change})`;
  }
}
