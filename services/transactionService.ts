import { Character, UserProfile, InventoryItem, Transaction } from '../types';

export class TransactionService {
  /**
   * Process a transaction from User to Character (Transfer or Gift)
   */
  public static processUserToChar(
    user: UserProfile,
    character: Character,
    amount: number,
    item?: InventoryItem
  ): { user: UserProfile; character: Character; success: boolean; message?: string } {
    
    // 1. Validate User Balance/Inventory
    if (amount > 0 && user.money < amount) {
      return { user, character, success: false, message: `Số dư không đủ ${amount} ${user.currencyName || 'tiền'}` };
    }

    if (item) {
      const itemIndex = user.inventory.findIndex(i => i.id === item.id || i.name === item.name);
      if (itemIndex === -1) {
        return { user, character, success: false, message: `Không có vật phẩm ${item.name} trong túi` };
      }
    }

    // 2. Deduct from User
    let newUser = { ...user };
    if (amount > 0) {
      newUser.money -= amount;
    }
    if (item) {
      const newInv = [...newUser.inventory];
      const idx = newInv.findIndex(i => i.id === item.id || i.name === item.name);
      if (idx !== -1) {
        if (newInv[idx].quantity && newInv[idx].quantity! > 1) {
            newInv[idx] = { ...newInv[idx], quantity: newInv[idx].quantity! - 1 };
        } else {
            newInv.splice(idx, 1);
        }
      }
      newUser.inventory = newInv;
    }

    // 3. Add to Character
    let newChar = { ...character };
    if (amount > 0) {
      newChar.money = (newChar.money || 0) + amount;
      
      // Add Transaction Record for Character
      const transaction: Transaction = {
        id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'IN',
        amount: amount,
        description: `Nhận chuyển khoản từ ${user.name}`,
        date: Date.now()
      };
      newChar.transactions = [transaction, ...(newChar.transactions || [])];
    }
    
    if (item) {
      const newInv = [...(newChar.inventory || [])];
      // Check if item exists to stack
      const existingIdx = newInv.findIndex(i => i.name === item.name);
      if (existingIdx !== -1) {
          newInv[existingIdx] = { 
              ...newInv[existingIdx], 
              quantity: (newInv[existingIdx].quantity || 1) + 1 
          };
      } else {
          newInv.push({ ...item, quantity: 1 });
      }
      newChar.inventory = newInv;
    }

    return { user: newUser, character: newChar, success: true };
  }

  /**
   * Process a transaction from Character to User (Transfer or Gift)
   */
  public static processCharToUser(
    user: UserProfile,
    character: Character,
    amount: number,
    giftItem?: InventoryItem
  ): { user: UserProfile; character: Character } {
    
    // 1. Deduct from Character
    let newChar = { ...character };
    
    if (amount > 0) {
      newChar.money = (newChar.money || 0) - amount;
      
      // Add Transaction Record for Character
      const transaction: Transaction = {
        id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'OUT',
        amount: amount,
        description: `Chuyển khoản cho ${user.name}`,
        date: Date.now()
      };
      newChar.transactions = [transaction, ...(newChar.transactions || [])];
    }

    // Note: For gifts from AI, we usually don't deduct from AI inventory 
    // because AI "generates" the gift. But if we wanted to be strict, we could.
    // For now, we assume AI generates the gift.

    // 2. Add to User
    let newUser = { ...user };
    if (amount > 0) {
      newUser.money += amount;
    }
    if (giftItem) {
      const newInv = [...(newUser.inventory || [])];
      // Check stack
      const existingIdx = newInv.findIndex(i => i.name === giftItem.name);
      if (existingIdx !== -1) {
          newInv[existingIdx] = { 
              ...newInv[existingIdx], 
              quantity: (newInv[existingIdx].quantity || 1) + 1 
          };
      } else {
          newInv.push({ ...giftItem, quantity: 1 });
      }
      newUser.inventory = newInv;
    }

    return { user: newUser, character: newChar };
  }

  /**
   * Process a transaction for the Character (Spending/Earning)
   */
  public static processCharTransaction(
    character: Character,
    amount: number,
    description: string
  ): Character {
    let newChar = { ...character };
    newChar.money = (newChar.money || 0) + amount;
    
    const transaction: Transaction = {
      id: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: amount >= 0 ? 'IN' : 'OUT',
      amount: Math.abs(amount),
      description: description,
      date: Date.now()
    };
    newChar.transactions = [transaction, ...(newChar.transactions || [])];
    
    return newChar;
  }
}
