import { Place } from "@/types/places";

export const mockPlaces: Place[] = [
  {
    id: "p1",
    name: "Cubbon Park",
    address: "Kasturba Road, Behind High Court of Karnataka, Bengaluru",
    lat: 12.9779,
    lng: 77.5952,
    category: "nature",
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1596440186548-dd3a8e974cb3?w=800&auto=format&fit=crop",
    tags: ["park", "nature", "relax", "walking"],
    description: "A large public park in the heart of the city with lush green spaces and historic bamboos.",
    createdAt: new Date().toISOString()
  },
  {
    id: "p2",
    name: "Toit Brewpub",
    address: "298, 100 Feet Rd, Indiranagar, Bengaluru",
    lat: 12.9791,
    lng: 77.6405,
    category: "dining",
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop",
    tags: ["brewery", "nightlife", "craft beer", "food"],
    description: "One of Bangalore's most famous microbreweries. The Tintin Toit is a must-try!",
    createdAt: new Date().toISOString()
  },
  {
    id: "p3",
    name: "Bangalore Palace",
    address: "Vasanth Nagar, Bengaluru",
    lat: 12.9988,
    lng: 77.5921,
    category: "historic",
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1627918544837-251c8e03e7c3?w=800&auto=format&fit=crop",
    tags: ["architecture", "history", "palace", "sightseeing"],
    description: "Beautiful Tudor-style architecture influenced by England's Windsor Castle.",
    createdAt: new Date().toISOString()
  },
  {
    id: "p4",
    name: "Third Wave Coffee Roasters",
    address: "80 Feet Rd, Koramangala 4th Block, Bengaluru",
    lat: 12.9341,
    lng: 77.6310,
    category: "cafe",
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop",
    tags: ["coffee", "work", "cafe", "breakfast"],
    description: "Great place to grab specialty coffee and work for a few hours. Excellent pour overs.",
    createdAt: new Date().toISOString()
  },
  {
    id: "p5",
    name: "Nandi Hills",
    address: "Chikkaballapur District, near Bengaluru",
    lat: 13.3702,
    lng: 77.6835,
    category: "attraction",
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1596440186716-1681283eac7c?w=800&auto=format&fit=crop",
    tags: ["sunset", "hills", "drive", "viewpoint"],
    description: "Popular weekend getaway for a sunrise view above the clouds.",
    createdAt: new Date().toISOString()
  }
];
