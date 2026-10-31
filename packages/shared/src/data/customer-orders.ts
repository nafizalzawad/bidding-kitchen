import type { CustomerOrder } from '../types/models.js';

export const CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: 'order_spicy_kick',
    title: 'Spicy Kick',
    description: 'Customer wants heat: Include at least 2 Spicy ingredients',
    bonusPoints: 5,
    requiredTags: ['SPICY'],
    minTagCount: 2,
  },
  {
    id: 'order_rich_indulgence',
    title: 'Rich Indulgence',
    description: 'Customer wants luxury: Include at least 2 Rich ingredients',
    bonusPoints: 5,
    requiredTags: ['RICH'],
    minTagCount: 2,
  },
  {
    id: 'order_smoke_master',
    title: 'Smoke Master',
    description: 'Customer craves woodsmoke: Include at least 2 Smoky ingredients',
    bonusPoints: 5,
    requiredTags: ['SMOKY'],
    minTagCount: 2,
  },
  {
    id: 'order_crunch_time',
    title: 'Crunch Time',
    description: 'Customer wants crunch: Include at least 2 Crispy ingredients',
    bonusPoints: 5,
    requiredTags: ['CRISPY'],
    minTagCount: 2,
  },
  {
    id: 'order_fresh_bite',
    title: 'Fresh Bite',
    description: 'Customer wants crisp produce: Include at least 1 Fresh ingredient',
    bonusPoints: 5,
    requiredTags: ['FRESH'],
    minTagCount: 1,
  },
  {
    id: 'order_no_cheese_purist',
    title: 'No Cheese Purist',
    description: 'Customer ordered dairy-free: Use the $0 Basic fallback for Cheese',
    bonusPoints: 5,
    forbiddenSlotNonBasic: 'CHEESE',
  },
];
