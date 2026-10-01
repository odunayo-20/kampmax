export interface ResidenceHall {
  id: string;
  name: string;
  campusId: string;
  type: "on_campus" | "off_campus";
  gender?: "male" | "female" | "mixed";
  description?: string;
  popular?: boolean;
}

export const CAMPUS_RESIDENCES: Record<string, ResidenceHall[]> = {
  unilag: [
    // On-campus halls
    { id: "unilag-moremi", name: "Moremi Hall", campusId: "unilag", type: "on_campus", gender: "female", popular: true, description: "Main female hall opposite SUB" },
    { id: "unilag-jaja", name: "Jaja Hall", campusId: "unilag", type: "on_campus", gender: "male", popular: true, description: "Male undergraduate hall near medical centre" },
    { id: "unilag-mariere", name: "Mariere Hall", campusId: "unilag", type: "on_campus", gender: "male", description: "Male undergraduate hall" },
    { id: "unilag-amina", name: "Queen Amina Hall", campusId: "unilag", type: "on_campus", gender: "female", popular: true, description: "Female hall near faculty of arts" },
    { id: "unilag-eni-njoku", name: "Eni Njoku Hall", campusId: "unilag", type: "on_campus", gender: "male", description: "Male undergraduate hall" },
    { id: "unilag-fagunwa", name: "Fagunwa Hall", campusId: "unilag", type: "on_campus", gender: "female", description: "Female undergraduate hall" },
    { id: "unilag-mth", name: "Madam Tinubu Hall (MTH)", campusId: "unilag", type: "on_campus", gender: "female", description: "Female hostel near sports centre" },
    { id: "unilag-shodeinde", name: "Shodeinde Hall", campusId: "unilag", type: "on_campus", gender: "male", description: "New hall complex male hostel" },
    { id: "unilag-kofo", name: "Kofo Ademola Hall", campusId: "unilag", type: "on_campus", gender: "female", description: "Female undergraduate hall" },
    { id: "unilag-makama", name: "Makama Bida Hall", campusId: "unilag", type: "on_campus", gender: "male", description: "Male hostel" },
    { id: "unilag-biobaku", name: "Biobaku Hall", campusId: "unilag", type: "on_campus", gender: "male", description: "Male hostel" },
    // Off-campus areas
    { id: "unilag-akoka-main", name: "Akoka Main / Community Road", campusId: "unilag", type: "off_campus", popular: true, description: "Student residential zone right outside campus gate" },
    { id: "unilag-bariga", name: "St. Finbarr's / Bariga", campusId: "unilag", type: "off_campus", description: "Off-campus residential student neighborhood" },
    { id: "unilag-abule-oja", name: "Abule Oja", campusId: "unilag", type: "off_campus", popular: true, description: "Off-campus student apartments & eateries hub" },
    { id: "unilag-onike", name: "Onike / Iwaya Axis", campusId: "unilag", type: "off_campus", description: "Hostel area 5 mins from main gate" },
    { id: "unilag-yaba", name: "Yaba Tech / Commercial Ave", campusId: "unilag", type: "off_campus", description: "Central Yaba tech & student belt" },
  ],
  oau: [
    // On-campus halls
    { id: "oau-awolowo", name: "Awolowo Hall (Awo)", campusId: "oau", type: "on_campus", gender: "male", popular: true, description: "Famous Awo hall with buzzing cafe & market" },
    { id: "oau-moremi", name: "Moremi Hall", campusId: "oau", type: "on_campus", gender: "female", popular: true, description: "Female undergraduate hall" },
    { id: "oau-angola", name: "Angola Hall", campusId: "oau", type: "on_campus", gender: "male", description: "Freshmen male hall" },
    { id: "oau-mozambique", name: "Mozambique Hall (Moz)", campusId: "oau", type: "on_campus", gender: "female", popular: true, description: "Freshmen female hall" },
    { id: "oau-fajuyi", name: "Fajuyi Hall (Faj)", campusId: "oau", type: "on_campus", gender: "male", description: "Male undergraduate hall" },
    { id: "oau-akintola", name: "Ladoke Akintola Hall", campusId: "oau", type: "on_campus", gender: "female", description: "Female hall" },
    { id: "oau-alumni", name: "Alumni Hall", campusId: "oau", type: "on_campus", gender: "female", description: "Postgraduate & undergraduate female hall" },
    { id: "oau-etf", name: "ETF Hostels", campusId: "oau", type: "on_campus", gender: "mixed", description: "Modern hostel blocks" },
    // Off-campus areas
    { id: "oau-mayfair", name: "Mayfair / Campus Gate", campusId: "oau", type: "off_campus", popular: true, description: "Major student commercial & residential hub" },
    { id: "oau-ede-road", name: "Ede Road / Asherifa", campusId: "oau", type: "off_campus", popular: true, description: "High-density private student hostels" },
    { id: "oau-ibadan-road", name: "Ibadan Road Axis", campusId: "oau", type: "off_campus", description: "Private apartment complexes" },
    { id: "oau-parakin", name: "Parakin Estate", campusId: "oau", type: "off_campus", description: "Quiet residential student quarters" },
  ],
  ui: [
    // On-campus halls
    { id: "ui-tedder", name: "Lord Tedder Hall", campusId: "ui", type: "on_campus", gender: "male", popular: true, description: "Central male hall" },
    { id: "ui-mellanby", name: "Kenneth Mellanby Hall", campusId: "ui", type: "on_campus", gender: "male", description: "Premier hall of residence" },
    { id: "ui-kuti", name: "Ransome Kuti Hall", campusId: "ui", type: "on_campus", gender: "male", description: "Male undergraduate hall" },
    { id: "ui-sultan-bello", name: "Sultan Bello Hall", campusId: "ui", type: "on_campus", gender: "male", description: "Gentlemen's hall of fame" },
    { id: "ui-queen-elizabeth", name: "Queen Elizabeth II Hall", campusId: "ui", type: "on_campus", gender: "female", popular: true, description: "Female undergraduate hall" },
    { id: "ui-queen-idia", name: "Queen Idia Hall", campusId: "ui", type: "on_campus", gender: "female", popular: true, description: "Female undergraduate hall" },
    { id: "ui-independence", name: "Independence Hall (Katanga)", campusId: "ui", type: "on_campus", gender: "male", popular: true, description: "Katanga republic hall" },
    { id: "ui-nnamdi-azikiwe", name: "Nnamdi Azikiwe Hall (Zik)", campusId: "ui", type: "on_campus", gender: "male", description: "Baluba republic male hall" },
    { id: "ui-awolowo", name: "Obafemi Awolowo Hall (Awo)", campusId: "ui", type: "on_campus", gender: "female", description: "Postgraduate & undergraduate hall" },
    { id: "ui-abh", name: "Alexander Brown Hall (ABH UCH)", campusId: "ui", type: "on_campus", gender: "mixed", description: "Clinical students hostel at UCH" },
    // Off-campus areas
    { id: "ui-agbowo", name: "Agbowo Community", campusId: "ui", type: "off_campus", popular: true, description: "Primary student hostel area opposite UI Main Gate" },
    { id: "ui-bodija", name: "Bodija / Oju-Irin", campusId: "ui", type: "off_campus", popular: true, description: "Residential neighborhood with student lodges" },
    { id: "ui-samonda", name: "Samonda / Sango", campusId: "ui", type: "off_campus", description: "Commercial student lodges along express" },
    { id: "ui-second-gate", name: "UI Second Gate / Ajibode", campusId: "ui", type: "off_campus", description: "Fast-growing off-campus student hub" },
  ],
  rugipo: [
    // On-campus halls
    { id: "rugipo-hall1", name: "Hall 1 (Male Hostel)", campusId: "rugipo", type: "on_campus", gender: "male", popular: true, description: "Main campus male hostel" },
    { id: "rugipo-hall2", name: "Hall 2 (Female Hostel)", campusId: "rugipo", type: "on_campus", gender: "female", popular: true, description: "Central female hostel" },
    { id: "rugipo-hall3", name: "Hall 3", campusId: "rugipo", type: "on_campus", gender: "mixed", description: "Student accommodation block" },
    { id: "rugipo-etf", name: "ETF Hostels", campusId: "rugipo", type: "on_campus", gender: "mixed", description: "Campus ETF hostel wing" },
    { id: "rugipo-nddc", name: "NDDC Hostel Complex", campusId: "rugipo", type: "on_campus", gender: "mixed", popular: true, description: "Modern polytechnic hostel" },
    // Off-campus areas
    { id: "rugipo-folahan", name: "Folahan Area", campusId: "rugipo", type: "off_campus", popular: true, description: "High student population residential lodge area" },
    { id: "rugipo-poly-road", name: "Poly Road / Campus Gate", campusId: "rugipo", type: "off_campus", popular: true, description: "Bustling market and hostel belt" },
    { id: "rugipo-owatowose", name: "Owatowose Street", campusId: "rugipo", type: "off_campus", description: "Private lodges near campus" },
    { id: "rugipo-junction", name: "Owo Junction / Mobil", campusId: "rugipo", type: "off_campus", description: "Convenient pickup and residential area" },
    { id: "rugipo-veteran", name: "Veteran Area", campusId: "rugipo", type: "off_campus", description: "Student residential zone" },
  ],
  unn: [
    // On-campus halls
    { id: "unn-franco", name: "Franco Hostel (Sir Louis Mbanefo)", campusId: "unn", type: "on_campus", gender: "male", popular: true, description: "Iconic male hostel" },
    { id: "unn-bello", name: "Bello Hall", campusId: "unn", type: "on_campus", gender: "female", popular: true, description: "Female hostel near library" },
    { id: "unn-okeke", name: "Okeke Hall", campusId: "unn", type: "on_campus", gender: "female", description: "Female hostel" },
    { id: "unn-akintola", name: "Akintola Hall", campusId: "unn", type: "on_campus", gender: "female", description: "Female hostel" },
    { id: "unn-awolowo", name: "Awolowo Hall", campusId: "unn", type: "on_campus", gender: "male", description: "Male hostel" },
    { id: "unn-isa-kaita", name: "Isa Kaita Hall", campusId: "unn", type: "on_campus", gender: "female", description: "Female hostel" },
    { id: "unn-balewa", name: "Balewa Hall", campusId: "unn", type: "on_campus", gender: "female", description: "Female hostel" },
    { id: "unn-slessor", name: "Mary Slessor Hall", campusId: "unn", type: "on_campus", gender: "female", description: "Female hostel" },
    { id: "unn-eyo-ita", name: "Eyo Ita Hall", campusId: "unn", type: "on_campus", gender: "female", description: "Female hostel" },
    // Off-campus areas
    { id: "unn-hilltop", name: "Hilltop Student Zone", campusId: "unn", type: "off_campus", popular: true, description: "Most vibrant student hostel neighborhood outside UNN" },
    { id: "unn-ofulonu", name: "Ofulonu / Odim Gate", campusId: "unn", type: "off_campus", popular: true, description: "High-density private hostels" },
    { id: "unn-greenhouse", name: "Green House Area", campusId: "unn", type: "off_campus", description: "Student lodges near campus exit" },
    { id: "unn-university-rd", name: "University Road Nsukka", campusId: "unn", type: "off_campus", description: "Commercial & residential spine" },
  ],
  abu: [
    // On-campus halls
    { id: "abu-izza", name: "Izza Hall", campusId: "abu", type: "on_campus", gender: "male", popular: true, description: "Central male hostel" },
    { id: "abu-ribadu", name: "Ribadu Hall", campusId: "abu", type: "on_campus", gender: "female", popular: true, description: "Female undergraduate hall" },
    { id: "abu-suleiman", name: "Suleiman Hall", campusId: "abu", type: "on_campus", gender: "male", popular: true, description: "Popular male hostel" },
    { id: "abu-danfodio", name: "Danfodio Hall", campusId: "abu", type: "on_campus", gender: "male", description: "Male hostel" },
    { id: "abu-alexander", name: "Alexander Hall", campusId: "abu", type: "on_campus", gender: "female", description: "Female hall" },
    { id: "abu-amina", name: "Amina Hall", campusId: "abu", type: "on_campus", gender: "female", description: "Female hall" },
    // Off-campus areas
    { id: "abu-samaru", name: "Samaru Community", campusId: "abu", type: "off_campus", popular: true, description: "Vibrant student trading & hostel strip" },
    { id: "abu-kongo", name: "Kongo Campus / Area", campusId: "abu", type: "off_campus", description: "Law and administration campus hub" },
    { id: "abu-basawa", name: "Basawa Road", campusId: "abu", type: "off_campus", description: "Private student lodges" },
  ],
  uniabuja: [
    // On-campus halls
    { id: "uniabuja-hostel-a", name: "Main Campus Hostel A", campusId: "uniabuja", type: "on_campus", gender: "male", popular: true, description: "Permanent site male hostel" },
    { id: "uniabuja-hostel-b", name: "Main Campus Hostel B", campusId: "uniabuja", type: "on_campus", gender: "female", popular: true, description: "Permanent site female hostel" },
    { id: "uniabuja-mini", name: "Mini Campus Hostels", campusId: "uniabuja", type: "on_campus", gender: "mixed", description: "Gwagwalada mini campus" },
    // Off-campus areas
    { id: "uniabuja-giri", name: "Giri Junction / Village", campusId: "uniabuja", type: "off_campus", popular: true, description: "Major private student residences" },
    { id: "uniabuja-gwagwalada", name: "Gwagwalada Central", campusId: "uniabuja", type: "off_campus", popular: true, description: "Off-campus student belt" },
    { id: "uniabuja-staff-quarters", name: "Staff Quarters / Road Safety", campusId: "uniabuja", type: "off_campus", description: "Nearby student apartments" },
  ],
  futo: [
    // On-campus halls
    { id: "futo-hall1", name: "Hall 1", campusId: "futo", type: "on_campus", gender: "male", popular: true, description: "Undergraduate hostel" },
    { id: "futo-hall2", name: "Hall 2", campusId: "futo", type: "on_campus", gender: "female", popular: true, description: "Female undergraduate hostel" },
    { id: "futo-hall3", name: "Hall 3", campusId: "futo", type: "on_campus", gender: "female", description: "Female hostel" },
    { id: "futo-hall4", name: "Hall 4", campusId: "futo", type: "on_campus", gender: "male", description: "Male hostel" },
    { id: "futo-hall5", name: "Hall 5", campusId: "futo", type: "on_campus", gender: "male", description: "Male hostel" },
    { id: "futo-nddc", name: "NDDC Hostel", campusId: "futo", type: "on_campus", gender: "mixed", popular: true, description: "Modern campus hostel" },
    // Off-campus areas
    { id: "futo-eziobodo", name: "Eziobodo Village", campusId: "futo", type: "off_campus", popular: true, description: "High-density student lodge zone near gate" },
    { id: "futo-umuchima", name: "Umuchima Hub", campusId: "futo", type: "off_campus", popular: true, description: "Lively student residential community" },
    { id: "futo-ihiagwa", name: "Ihiagwa Market & Lodges", campusId: "futo", type: "off_campus", description: "Extensive student apartments" },
  ],
};

/**
 * Returns available halls of residence and off-campus zones for a given campus ID.
 */
export function getHallsForCampus(campusId?: string | null): ResidenceHall[] {
  if (!campusId) return [];
  const normalized = campusId.toLowerCase().trim();
  return CAMPUS_RESIDENCES[normalized] || [];
}

/**
 * Returns summary stats of halls for a given campus ID.
 */
export function getCampusDeliverySummary(campusId?: string | null) {
  const halls = getHallsForCampus(campusId);
  const onCampusCount = halls.filter((h) => h.type === "on_campus").length;
  const offCampusCount = halls.filter((h) => h.type === "off_campus").length;
  return {
    total: halls.length,
    onCampusCount,
    offCampusCount,
  };
}
