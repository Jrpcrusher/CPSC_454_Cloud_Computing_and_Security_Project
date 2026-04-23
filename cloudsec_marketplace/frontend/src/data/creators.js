// Hardcoded demo creators (no backend account — for showcase only)
export const creators = [
  {
    id: 1,
    username: "inkwave",
    displayName: "InkWave",
    avatar: "https://i.pravatar.cc/150?img=11",
    banner: "https://picsum.photos/seed/inkwave/1200/300",
    bio: "Digital illustrator specializing in anime-inspired character art and detailed fantasy scenes. I bring your OCs and story characters to life with vibrant color work and dynamic poses.",
    tags: ["Anime", "Character Design", "Fantasy", "Digital"],
    stats: { completedRequests: 142, rating: 4.9, responseTime: "2 days" },
    tiers: [
      {
        name: "Sketch",
        price: 15,
        perks: ["Pencil/ink sketch", "1 character", "1 revision", "PNG delivery"],
      },
      {
        name: "Lineart",
        price: 35,
        perks: ["Clean lineart", "Up to 2 characters", "2 revisions", "Commercial use"],
      },
      {
        name: "Full Color",
        price: 75,
        perks: ["Full color + shading", "Up to 3 characters", "Background included", "5 revisions", "Commercial use", "PSD source file"],
      },
    ],
    portfolio: [
      "https://picsum.photos/seed/ink1/400/400",
      "https://picsum.photos/seed/ink2/400/400",
      "https://picsum.photos/seed/ink3/400/400",
      "https://picsum.photos/seed/ink4/400/400",
      "https://picsum.photos/seed/ink5/400/400",
      "https://picsum.photos/seed/ink6/400/400",
    ],
  },
  {
    id: 2,
    username: "pixelroot",
    displayName: "PixelRoot",
    avatar: "https://i.pravatar.cc/150?img=22",
    banner: "https://picsum.photos/seed/pixelroot/1200/300",
    bio: "Pixel artist with 8 years of experience. Specializing in retro game sprites, tilemaps, and character animations. Perfect for indie game devs and retro enthusiasts.",
    tags: ["Pixel Art", "Sprite Work", "Game Assets", "Retro"],
    stats: { completedRequests: 98, rating: 4.8, responseTime: "3 days" },
    tiers: [
      {
        name: "Single Sprite",
        price: 20,
        perks: ["16x16 or 32x32 sprite", "1 character/item", "2 revisions", "PNG + transparent"],
      },
      {
        name: "Animated",
        price: 50,
        perks: ["Up to 64x64 sprite", "Up to 4 animation frames", "3 revisions", "GIF + PNG sheets"],
      },
      {
        name: "Full Asset Pack",
        price: 120,
        perks: ["Custom resolution", "Character + animations", "Matching tilesets", "Unlimited revisions", "Commercial license"],
      },
    ],
    portfolio: [
      "https://picsum.photos/seed/pix1/400/400",
      "https://picsum.photos/seed/pix2/400/400",
      "https://picsum.photos/seed/pix3/400/400",
      "https://picsum.photos/seed/pix4/400/400",
      "https://picsum.photos/seed/pix5/400/400",
      "https://picsum.photos/seed/pix6/400/400",
    ],
  },
  {
    id: 3,
    username: "veloursketch",
    displayName: "VelourSketch",
    avatar: "https://i.pravatar.cc/150?img=35",
    banner: "https://picsum.photos/seed/velour/1200/300",
    bio: "Portrait and concept artist with a painterly style. From detailed busts to full-body illustrations, I capture personality and mood in every piece.",
    tags: ["Portraits", "Concept Art", "Painterly", "OC Art"],
    stats: { completedRequests: 67, rating: 5.0, responseTime: "4 days" },
    tiers: [
      {
        name: "Bust",
        price: 30,
        perks: ["Head + shoulders", "Flat color", "1 character", "2 revisions"],
      },
      {
        name: "Half Body",
        price: 55,
        perks: ["Waist up", "Full shading", "1 character", "3 revisions", "Background"],
      },
      {
        name: "Full Illustration",
        price: 100,
        perks: ["Full body", "Detailed painterly render", "Up to 2 characters", "Complex background", "Unlimited revisions", "Print-ready"],
      },
    ],
    portfolio: [
      "https://picsum.photos/seed/vel1/400/400",
      "https://picsum.photos/seed/vel2/400/400",
      "https://picsum.photos/seed/vel3/400/400",
      "https://picsum.photos/seed/vel4/400/400",
      "https://picsum.photos/seed/vel5/400/400",
      "https://picsum.photos/seed/vel6/400/400",
    ],
  },
  {
    id: 4,
    username: "neonmoth",
    displayName: "NeonMoth",
    avatar: "https://i.pravatar.cc/150?img=47",
    banner: "https://picsum.photos/seed/neonmoth/1200/300",
    bio: "Cyberpunk and sci-fi illustrator. Neon lights, chrome surfaces, and glitchy aesthetics are my playground. I love creating vivid futuristic worlds and characters.",
    tags: ["Cyberpunk", "Sci-Fi", "Concept Art", "Digital"],
    stats: { completedRequests: 211, rating: 4.7, responseTime: "1 day" },
    tiers: [
      {
        name: "Icon",
        price: 25,
        perks: ["Profile-sized illustration", "1 character", "Neon/glow effects", "2 revisions"],
      },
      {
        name: "Scene",
        price: 60,
        perks: ["Full character", "Environmental background", "Lighting pass", "3 revisions"],
      },
      {
        name: "Cover Art",
        price: 150,
        perks: ["High-res print ready", "Multi-character", "Detailed cityscape", "Unlimited revisions", "Commercial use", "Layered PSD"],
      },
    ],
    portfolio: [
      "https://picsum.photos/seed/neo1/400/400",
      "https://picsum.photos/seed/neo2/400/400",
      "https://picsum.photos/seed/neo3/400/400",
      "https://picsum.photos/seed/neo4/400/400",
      "https://picsum.photos/seed/neo5/400/400",
      "https://picsum.photos/seed/neo6/400/400",
    ],
  },
  {
    id: 5,
    username: "softpetal",
    displayName: "SoftPetal",
    avatar: "https://i.pravatar.cc/150?img=56",
    banner: "https://picsum.photos/seed/softpetal/1200/300",
    bio: "Chibi and cute art specialist! I create adorable character designs, sticker packs, and emotes perfect for streamers, Discord servers, and personal use.",
    tags: ["Chibi", "Cute", "Emotes", "Stickers"],
    stats: { completedRequests: 334, rating: 4.9, responseTime: "1 day" },
    tiers: [
      {
        name: "Single Emote",
        price: 12,
        perks: ["112x112 emote", "Flat color", "1 expression", "2 revisions"],
      },
      {
        name: "Emote Pack",
        price: 45,
        perks: ["5 emotes", "Matching style", "Flat color + outline", "3 revisions"],
      },
      {
        name: "Full Chibi",
        price: 65,
        perks: ["Full chibi character", "Color + shading", "Simple background", "Sticker-ready", "Unlimited revisions", "Commercial use"],
      },
    ],
    portfolio: [
      "https://picsum.photos/seed/sof1/400/400",
      "https://picsum.photos/seed/sof2/400/400",
      "https://picsum.photos/seed/sof3/400/400",
      "https://picsum.photos/seed/sof4/400/400",
      "https://picsum.photos/seed/sof5/400/400",
      "https://picsum.photos/seed/sof6/400/400",
    ],
  },
  {
    id: 6,
    username: "gravemarker",
    displayName: "GraveMarker",
    avatar: "https://i.pravatar.cc/150?img=68",
    banner: "https://picsum.photos/seed/grave/1200/300",
    bio: "Dark fantasy and horror illustrator. Monsters, grim landscapes, gothic characters — if it's unsettling and beautiful, that's my specialty.",
    tags: ["Dark Fantasy", "Horror", "Monsters", "Gothic"],
    stats: { completedRequests: 89, rating: 4.8, responseTime: "5 days" },
    tiers: [
      {
        name: "Creature Sketch",
        price: 20,
        perks: ["Detailed pencil sketch", "1 creature/character", "2 revisions"],
      },
      {
        name: "Inked & Shaded",
        price: 55,
        perks: ["Ink lineart + greyscale shading", "1-2 characters", "Complex detail", "3 revisions"],
      },
      {
        name: "Dark Illustration",
        price: 110,
        perks: ["Full color dark art", "Multi-character scene", "Atmospheric background", "Unlimited revisions", "Commercial use"],
      },
    ],
    portfolio: [
      "https://picsum.photos/seed/gra1/400/400",
      "https://picsum.photos/seed/gra2/400/400",
      "https://picsum.photos/seed/gra3/400/400",
      "https://picsum.photos/seed/gra4/400/400",
      "https://picsum.photos/seed/gra5/400/400",
      "https://picsum.photos/seed/gra6/400/400",
    ],
  },
];

// Map a backend PublicProfile to the creator card shape
export function backendProfileToCreator(profile) {
  const localCreators = JSON.parse(localStorage.getItem("userCreators") || "[]");
  const localProfile = localCreators.find((c) => c.user_id === profile.user_id);

  return {
    id: profile.user_id,
    user_id: profile.user_id,
    username: profile.creator_username || profile.username,
    displayName: profile.creator_username || profile.username,
    avatar:
      profile.pfp_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=5865f2&color=fff&size=150`,
    banner:
      localProfile?.banner ||
      `https://picsum.photos/seed/${profile.username}/1200/300`,
    bio: profile.description || localProfile?.bio || "No bio yet.",
    tags: localProfile?.tags || [],
    stats: localProfile?.stats || { completedRequests: 0, rating: "New", responseTime: "TBD" },
    tiers: localProfile?.tiers || [],
    portfolio: localProfile?.portfolio || [],
  };
}

// Returns user-created creator profiles stored in localStorage
export function getUserCreators() {
  return JSON.parse(localStorage.getItem("userCreators") || "[]");
}

// Merges mock creators + user-created creators
export function getAllCreators() {
  return [...creators, ...getUserCreators()];
}

// Looks up by username across both sources
export function getCreatorByUsername(username) {
  return getAllCreators().find((c) => c.username === username) || null;
}
