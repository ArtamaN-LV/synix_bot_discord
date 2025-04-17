import mongoose from 'mongoose';
import { config } from '../config';
import Item from '../models/Item';
import Job from '../models/Job';
import { Logger } from '../utils/logger';

// Initial shop items
const shopItems = [
  // Tools category
  {
    itemId: 'fishing_rod',
    name: 'Fishing Rod',
    description: 'Used for fishing. Increases success rate when fishing.',
    price: 2500,
    sellPrice: 1000,
    emoji: '🎣',
    category: 'Tools',
    isLimited: false
  },
  {
    itemId: 'hunting_rifle',
    name: 'Hunting Rifle',
    description: 'Used for hunting. Increases success rate when hunting.',
    price: 5000,
    sellPrice: 2000,
    emoji: '🔫',
    category: 'Tools',
    isLimited: false
  },
  {
    itemId: 'shovel',
    name: 'Shovel',
    description: 'Used for digging. Find buried treasures more easily.',
    price: 1500,
    sellPrice: 600,
    emoji: '⛏️',
    category: 'Tools',
    isLimited: false
  },
  
  // Collectibles category
  {
    itemId: 'trophy',
    name: 'Golden Trophy',
    description: 'A prestigious trophy for your achievements.',
    price: 10000,
    sellPrice: 5000,
    emoji: '🏆',
    category: 'Collectibles',
    isLimited: false
  },
  {
    itemId: 'crown',
    name: 'Royal Crown',
    description: 'Show off your wealth with this luxurious crown.',
    price: 50000,
    sellPrice: 25000,
    emoji: '👑',
    category: 'Collectibles',
    isLimited: true,
    stock: 10
  },
  {
    itemId: 'diamond',
    name: 'Diamond Gem',
    description: 'A rare and valuable diamond.',
    price: 25000,
    sellPrice: 12500,
    emoji: '💎',
    category: 'Collectibles',
    isLimited: false
  },
  
  // Food category
  {
    itemId: 'pizza',
    name: 'Pizza',
    description: 'A delicious pizza. Restores energy when working.',
    price: 500,
    sellPrice: 100,
    emoji: '🍕',
    category: 'Food',
    isLimited: false
  },
  {
    itemId: 'burger',
    name: 'Burger',
    description: 'A juicy burger. Restores energy when working.',
    price: 300,
    sellPrice: 50,
    emoji: '🍔',
    category: 'Food',
    isLimited: false
  },
  {
    itemId: 'coffee',
    name: 'Coffee',
    description: 'A cup of coffee. Reduces work cooldown time.',
    price: 100,
    sellPrice: 10,
    emoji: '☕',
    category: 'Food',
    isLimited: false
  }
];

// Initial jobs
const jobs = [
  {
    jobId: 'cashier',
    name: 'Cashier',
    description: 'Work as a cashier in a local store.',
    salary: {
      min: 50,
      max: 150
    },
    xpReward: 10,
    failRate: 5,
    cooldown: 30, // 30 minutes
    requiredLevel: 1
  },
  {
    jobId: 'delivery',
    name: 'Delivery Driver',
    description: 'Deliver packages in your area.',
    salary: {
      min: 100,
      max: 300
    },
    xpReward: 15,
    failRate: 10,
    cooldown: 45, // 45 minutes
    requiredLevel: 3
  },
  {
    jobId: 'chef',
    name: 'Chef',
    description: 'Cook meals at a restaurant.',
    salary: {
      min: 200,
      max: 500
    },
    xpReward: 25,
    failRate: 15,
    cooldown: 60, // 60 minutes
    requiredLevel: 5
  },
  {
    jobId: 'programmer',
    name: 'Programmer',
    description: 'Write code for a tech company.',
    salary: {
      min: 400,
      max: 1000
    },
    xpReward: 40,
    failRate: 20,
    cooldown: 90, // 90 minutes
    requiredLevel: 10
  },
  {
    jobId: 'doctor',
    name: 'Doctor',
    description: 'Save lives at the hospital.',
    salary: {
      min: 800,
      max: 2000
    },
    xpReward: 60,
    failRate: 25,
    cooldown: 120, // 120 minutes
    requiredLevel: 15
  },
  {
    jobId: 'ceo',
    name: 'CEO',
    description: 'Run a major corporation.',
    salary: {
      min: 1500,
      max: 5000
    },
    xpReward: 100,
    failRate: 30,
    cooldown: 180, // 180 minutes
    requiredLevel: 25
  }
];

// Connect to MongoDB and seed data
async function seedData() {
  try {
    Logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri || '');
    Logger.info('Connected to MongoDB');
    
    // Clear existing data
    await Item.deleteMany({});
    await Job.deleteMany({});
    Logger.info('Cleared existing data');
    
    // Insert shop items
    await Item.insertMany(shopItems);
    Logger.info(`Added ${shopItems.length} shop items`);
    
    // Insert jobs
    await Job.insertMany(jobs);
    Logger.info(`Added ${jobs.length} jobs`);
    
    Logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    Logger.error('Error seeding database:');
    Logger.error(error as Error);
    process.exit(1);
  }
}

// Run the seeding function
seedData(); 