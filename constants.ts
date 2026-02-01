import { BloodGroup } from "./types";

export const BLOOD_GROUPS = Object.values(BloodGroup);

export const MOCK_DELAY = 600; // ms to simulate API latency

// Seed data for fresh install
export const SEED_USERS = [
  {
    id: 'admin-1',
    name: 'System Admin',
    email: 'shozolesm4409@gmail.com',
    password: 'admin123', // In a real app, this would be hashed
    role: 'ADMIN',
    bloodGroup: 'O+',
    location: 'Central Hospital',
    phone: '555-0100'
  },
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'user@bloodlink.com',
    password: 'user123',
    role: 'USER',
    bloodGroup: 'A+',
    location: 'New York',
    phone: '555-0123',
    lastDonationDate: '2023-10-15'
  }
];

export const SEED_DONATIONS = [
  {
    id: 'don-1',
    userId: 'user-1',
    userName: 'John Doe',
    userBloodGroup: 'A+',
    donationDate: '2023-10-15',
    location: 'City Blood Bank',
    units: 450,
    status: 'COMPLETED'
  },
  {
    id: 'don-2',
    userId: 'user-1',
    userName: 'John Doe',
    userBloodGroup: 'A+',
    donationDate: '2024-05-20',
    location: 'Mobile Clinic',
    units: 450,
    status: 'COMPLETED'
  }
];