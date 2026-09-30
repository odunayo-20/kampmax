import { CampusEvent } from "@/types";

export const events: CampusEvent[] = [
  {
    id: "e-fest-2025",
    campusId: "rugipo",
    title: "Kampmax Fest 2025",
    description:
      "The biggest campus event of the year! Enjoy live music, student food vendors, networking sessions, gaming tournaments, and more. Don't miss it!",
    location: "RUGIPO Main Auditorium, Owo",
    startDate: "2025-09-27T16:00:00Z",
    endDate: "2025-09-27T23:00:00Z",
    timeDisplay: "4:00 PM – 11:00 PM",
    organizerId: "u1",
    organizerName: "Kampmax Student Council & Entertainment",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80",
    attendees: ["u1", "u2", "u3", "u4", "u5", "u6", "u7"],
    maxAttendees: 1500,
    isVirtual: false,
    distance: "1.2 km",
    isFeatured: true,
    category: "Festival",
    tags: ["Music", "Food", "Networking", "Fun"],
    ticketPrice: 2000,
    ticketTiers: [
      {
        id: "tier-regular",
        name: "Regular",
        price: 2000,
        description: "General admission entry + 1 free drink voucher",
      },
      {
        id: "tier-vip",
        name: "VIP",
        price: 5000,
        description: "Front-row stage access, VIP lounge, free chops & cocktail",
        badge: "Popular",
      },
      {
        id: "tier-group",
        name: "Group (5+)",
        price: 8000,
        description: "Special discounted group pass for up to 5 students",
        badge: "Best Value",
      },
    ],
    createdAt: "2025-09-01T08:00:00Z",
  },
  {
    id: "e-tech-summit",
    campusId: "rugipo",
    title: "Tech & Innovation Summit",
    description:
      "Join top founders, software engineers, and tech creators from Ondo State. Keynote speeches, live product demos, hackathon awards, and hiring booths.",
    location: "RUGIPO Main Auditorium",
    startDate: "2025-09-27T10:00:00Z",
    endDate: "2025-09-27T15:00:00Z",
    timeDisplay: "10:00 AM – 3:00 PM",
    organizerId: "u2",
    organizerName: "Tech Hub RUGIPO",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80",
    attendees: ["u1", "u3", "u4"],
    maxAttendees: 300,
    isVirtual: false,
    distance: "0.6 km",
    isFeatured: false,
    category: "Tech",
    tags: ["Tech", "Coding", "Innovation", "Career"],
    ticketPrice: 0,
    ticketTiers: [
      {
        id: "tier-free",
        name: "General Admission",
        price: 0,
        description: "Free student pass (requires campus ID verification)",
      },
      {
        id: "tier-workshop",
        name: "Workshop Pass + Swag",
        price: 1500,
        description: "Entry to hands-on AI & Web3 workshop + official summit shirt",
      },
    ],
    createdAt: "2025-09-05T10:00:00Z",
  },
  {
    id: "e-career-fair",
    campusId: "rugipo",
    title: "Career & Internship Fair",
    description:
      "Meet 25+ top employers looking to hire students and fresh graduates for internships, part-time jobs, and graduate trainee roles. Bring your CV!",
    location: "RUGIPO Main Hall",
    startDate: "2025-10-01T09:00:00Z",
    endDate: "2025-10-01T16:00:00Z",
    timeDisplay: "9:00 AM – 4:00 PM",
    organizerId: "u3",
    organizerName: "RUGIPO Career Services Center",
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80",
    attendees: ["u1", "u2", "u5"],
    maxAttendees: 600,
    isVirtual: false,
    distance: "0.9 km",
    isFeatured: false,
    category: "Career",
    tags: ["Career", "Jobs", "Internship", "Hiring"],
    ticketPrice: 0,
    ticketTiers: [
      {
        id: "tier-career-free",
        name: "Standard Pass",
        price: 0,
        description: "Free entrance to all company booths and CV review clinics",
      },
    ],
    createdAt: "2025-09-10T09:00:00Z",
  },
  {
    id: "e-entrepreneurship",
    campusId: "rugipo",
    title: "Entrepreneurship Seminar",
    description:
      "Practical strategies for campus students to launch, market, and monetize their skills, side hustles, and eCommerce brands while studying.",
    location: "Student Centre, Room 102",
    startDate: "2025-10-03T13:00:00Z",
    endDate: "2025-10-03T16:30:00Z",
    timeDisplay: "1:00 PM – 4:30 PM",
    organizerId: "u4",
    organizerName: "Campus Entrepreneurship Society",
    imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80",
    attendees: ["u2", "u4"],
    maxAttendees: 150,
    isVirtual: false,
    distance: "1.5 km",
    isFeatured: false,
    category: "Business",
    tags: ["Business", "Startup", "Finance", "Growth"],
    ticketPrice: 0,
    ticketTiers: [
      {
        id: "tier-ent-free",
        name: "Free Pass",
        price: 0,
        description: "Access to keynote and Q&A session",
      },
    ],
    createdAt: "2025-09-12T14:00:00Z",
  },
  {
    id: "e3",
    campusId: "rugipo",
    title: "Campus Food & Grill Festival",
    description:
      "Taste the finest grills, pastries, mocktails, and campus street foods from top student food entrepreneurs. Music and giveaways all day!",
    location: "Cafeteria Ground, RUGIPO",
    startDate: "2025-10-10T12:00:00Z",
    endDate: "2025-10-10T21:00:00Z",
    timeDisplay: "12:00 PM – 9:00 PM",
    organizerId: "u5",
    organizerName: "Campus Bites & RUGIPO Foodies",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
    attendees: ["u1", "u2", "u5"],
    maxAttendees: 500,
    isVirtual: false,
    distance: "0.4 km",
    isFeatured: false,
    category: "Food",
    tags: ["Food", "Festival", "Campus Life", "Grill"],
    ticketPrice: 1000,
    ticketTiers: [
      {
        id: "tier-food-entry",
        name: "Entry + Tasting Voucher",
        price: 1000,
        description: "Entry ticket + ₦1,000 food voucher redeemable at any vendor",
      },
    ],
    createdAt: "2025-09-16T09:00:00Z",
  },
];

export function getEventsByCampus(campusId: string): CampusEvent[] {
  return events
    .filter((e) => e.campusId === campusId)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
}

export function getEventById(id: string): CampusEvent | undefined {
  return events.find((e) => e.id === id);
}

export function getFeaturedEvent(campusId?: string): CampusEvent | undefined {
  const list = campusId ? events.filter((e) => e.campusId === campusId) : events;
  return list.find((e) => e.isFeatured) || list[0];
}

export function getUpcomingEvents(campusId: string): CampusEvent[] {
  return getEventsByCampus(campusId);
}
