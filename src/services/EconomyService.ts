import User, { IUser } from '../models/User';
import Item, { IItem } from '../models/Item';
import Job, { IJob } from '../models/Job';
import { Logger } from '../utils/logger';

export class EconomyService {
  /**
   * Get a user's economy data or create if not exists
   */
  static async getUser(userId: string): Promise<IUser> {
    try {
      let user = await User.findOne({ userId });
      
      // Create new user if not found
      if (!user) {
        user = new User({ userId });
        await user.save();
      }
      
      return user;
    } catch (error) {
      Logger.error(`Error getting user economy data for ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Add money to user's wallet
   */
  static async addMoney(userId: string, amount: number): Promise<IUser> {
    try {
      const user = await this.getUser(userId);
      user.wallet += amount;
      await user.save();
      return user;
    } catch (error) {
      Logger.error(`Error adding money to user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Remove money from user's wallet
   */
  static async removeMoney(userId: string, amount: number): Promise<IUser | null> {
    try {
      const user = await this.getUser(userId);
      
      // Check if user has enough money
      if (user.wallet < amount) {
        return null;
      }
      
      user.wallet -= amount;
      await user.save();
      return user;
    } catch (error) {
      Logger.error(`Error removing money from user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Transfer money from wallet to bank
   */
  static async deposit(userId: string, amount: number): Promise<IUser | null> {
    try {
      const user = await this.getUser(userId);
      
      // Check if user has enough money in wallet
      if (user.wallet < amount) {
        return null;
      }
      
      user.wallet -= amount;
      user.bank += amount;
      await user.save();
      return user;
    } catch (error) {
      Logger.error(`Error depositing money for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Transfer money from bank to wallet
   */
  static async withdraw(userId: string, amount: number): Promise<IUser | null> {
    try {
      const user = await this.getUser(userId);
      
      // Check if user has enough money in bank
      if (user.bank < amount) {
        return null;
      }
      
      user.bank -= amount;
      user.wallet += amount;
      await user.save();
      return user;
    } catch (error) {
      Logger.error(`Error withdrawing money for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get all shop items
   */
  static async getShopItems(): Promise<IItem[]> {
    try {
      return await Item.find({});
    } catch (error) {
      Logger.error(`Error getting shop items: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get a specific item from the shop
   */
  static async getItem(itemId: string): Promise<IItem | null> {
    try {
      return await Item.findOne({ itemId });
    } catch (error) {
      Logger.error(`Error getting item ${itemId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Buy an item from the shop
   */
  static async buyItem(userId: string, itemId: string): Promise<{ success: boolean; user?: IUser; item?: IItem; message?: string }> {
    try {
      const [user, item] = await Promise.all([
        this.getUser(userId),
        this.getItem(itemId)
      ]);
      
      if (!item) {
        return { success: false, message: 'Item not found' };
      }
      
      // Check if user has enough money
      if (user.wallet < item.price) {
        return { success: false, message: 'Not enough money in wallet' };
      }
      
      // Check if limited item is in stock
      if (item.isLimited && (item.stock === 0 || item.stock === undefined)) {
        return { success: false, message: 'Item is out of stock' };
      }
      
      // Update item stock if it's limited
      if (item.isLimited && item.stock !== undefined) {
        item.stock -= 1;
        await item.save();
      }
      
      // Remove money from wallet
      user.wallet -= item.price;
      
      // Add item to inventory
      const existingItem = user.inventory.find(i => i.itemId === itemId);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        user.inventory.push({
          itemId: item.itemId,
          name: item.name,
          quantity: 1,
          price: item.price
        });
      }
      
      await user.save();
      
      return { success: true, user, item };
    } catch (error) {
      Logger.error(`Error buying item ${itemId} for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Sell an item from inventory
   */
  static async sellItem(userId: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; user?: IUser; itemName?: string; amount?: number; message?: string }> {
    try {
      const user = await this.getUser(userId);
      
      // Find item in inventory
      const inventoryItemIndex = user.inventory.findIndex(i => i.itemId === itemId);
      
      if (inventoryItemIndex === -1) {
        return { success: false, message: 'You don\'t own this item' };
      }
      
      const inventoryItem = user.inventory[inventoryItemIndex];
      
      // Check if user has enough quantity
      if (inventoryItem.quantity < quantity) {
        return { success: false, message: `You only have ${inventoryItem.quantity} of this item` };
      }
      
      // Get the actual item to get sell price
      const item = await this.getItem(itemId);
      
      if (!item) {
        return { success: false, message: 'Item not found in shop' };
      }
      
      // Calculate sell amount
      const sellAmount = item.sellPrice * quantity;
      
      // Update inventory
      if (inventoryItem.quantity === quantity) {
        // Remove item completely if selling all
        user.inventory.splice(inventoryItemIndex, 1);
      } else {
        // Decrease quantity
        inventoryItem.quantity -= quantity;
      }
      
      // Add money to wallet
      user.wallet += sellAmount;
      await user.save();
      
      return { success: true, user, itemName: item.name, amount: sellAmount };
    } catch (error) {
      Logger.error(`Error selling item ${itemId} for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get all available jobs
   */
  static async getJobs(): Promise<IJob[]> {
    try {
      return await Job.find({}).sort({ requiredLevel: 1 });
    } catch (error) {
      Logger.error(`Error getting jobs: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get a specific job
   */
  static async getJob(jobId: string): Promise<IJob | null> {
    try {
      return await Job.findOne({ jobId });
    } catch (error) {
      Logger.error(`Error getting job ${jobId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Apply for a job
   */
  static async applyForJob(userId: string, jobId: string): Promise<{ success: boolean; message?: string; user?: IUser; job?: IJob }> {
    try {
      const [user, job] = await Promise.all([
        this.getUser(userId),
        this.getJob(jobId)
      ]);
      
      if (!job) {
        return { success: false, message: 'Job not found' };
      }
      
      // Check if user meets level requirement
      if (user.level < job.requiredLevel) {
        return { success: false, message: `You need to be level ${job.requiredLevel} to apply for this job` };
      }
      
      // Set the user's job
      user.job = jobId;
      await user.save();
      
      return { success: true, user, job };
    } catch (error) {
      Logger.error(`Error applying for job ${jobId} for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Work at the current job
   */
  static async work(userId: string): Promise<{ success: boolean; message?: string; reward?: number; failed?: boolean }> {
    try {
      const user = await this.getUser(userId);
      
      // Check if user has a job
      if (!user.job) {
        return { success: false, message: 'You need to apply for a job first' };
      }
      
      // Check cooldown
      if (user.lastWork) {
        const now = new Date();
        const lastWork = new Date(user.lastWork);
        const job = await this.getJob(user.job);
        
        if (!job) {
          return { success: false, message: 'Your job no longer exists' };
        }
        
        const cooldownMinutes = job.cooldown;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const timeSinceLastWork = now.getTime() - lastWork.getTime();
        
        if (timeSinceLastWork < cooldownMs) {
          const timeLeft = Math.ceil((cooldownMs - timeSinceLastWork) / 60000);
          return { success: false, message: `You need to wait ${timeLeft} minute(s) before working again` };
        }
      }
      
      // Get job details
      const job = await this.getJob(user.job);
      
      if (!job) {
        return { success: false, message: 'Your job no longer exists' };
      }
      
      // Check for job failure
      const roll = Math.random() * 100;
      if (roll < job.failRate) {
        user.lastWork = new Date();
        await user.save();
        return { success: true, failed: true, reward: 0 };
      }
      
      // Calculate reward
      const reward = Math.floor(Math.random() * (job.salary.max - job.salary.min + 1)) + job.salary.min;
      
      // Update user
      user.wallet += reward;
      user.lastWork = new Date();
      user.xp += job.xpReward;
      
      // Check for level up (simple leveling formula)
      const xpNeeded = user.level * 100;
      if (user.xp >= xpNeeded) {
        user.level += 1;
        user.xp -= xpNeeded;
      }
      
      await user.save();
      
      return { success: true, reward };
    } catch (error) {
      Logger.error(`Error working for user ${userId}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Claim daily reward
   */
  static async claimDaily(userId: string): Promise<{ success: boolean; message?: string; amount?: number; streak?: number }> {
    try {
      const user = await this.getUser(userId);
      
      // Check if user already claimed daily reward
      if (user.lastDaily) {
        const now = new Date();
        const lastDaily = new Date(user.lastDaily);
        const timeSinceLastDaily = now.getTime() - lastDaily.getTime();
        
        // Check if 24 hours have passed
        if (timeSinceLastDaily < 24 * 60 * 60 * 1000) {
          const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - timeSinceLastDaily) / 3600000);
          return { success: false, message: `You already claimed your daily reward. Come back in ${hoursLeft} hour(s)` };
        }
      }
      
      // Calculate reward amount (base amount + streak bonus)
      const baseAmount = 100;
      const streakMultiplier = 0.1; // 10% bonus per streak day
      
      // Reset streak if more than 48 hours have passed
      if (user.lastDaily) {
        const now = new Date();
        const lastDaily = new Date(user.lastDaily);
        const timeSinceLastDaily = now.getTime() - lastDaily.getTime();
        
        if (timeSinceLastDaily > 48 * 60 * 60 * 1000) {
          user.workStreak = 0;
        }
      }
      
      // Increment streak
      user.workStreak += 1;
      
      // Calculate final reward
      const streakBonus = Math.floor(baseAmount * streakMultiplier * user.workStreak);
      const totalReward = baseAmount + streakBonus;
      
      // Update user
      user.wallet += totalReward;
      user.lastDaily = new Date();
      await user.save();
      
      return { success: true, amount: totalReward, streak: user.workStreak };
    } catch (error) {
      Logger.error(`Error claiming daily reward for user ${userId}: ${error}`);
      throw error;
    }
  }
} 