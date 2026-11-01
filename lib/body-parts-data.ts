/**
 * X-ray body part + view master lists (exact data supplied by Radionline).
 * Body part = single-select, View = multi-select in the Upload dialog.
 * The "OTHER" body part (id 74) is shown last and opens "add new".
 */
export interface BodyPartItem { id: number; name: string; short_name: string; is_special_procedure: boolean }
export interface ViewItem { id: number; name: string; short_name: string }

export const BODY_PARTS_DATA: BodyPartItem[] = [
  {
    "id": 1,
    "name": "Abdomen",
    "short_name": "abd",
    "is_special_procedure": false
  },
  {
    "id": 2,
    "name": "Kub",
    "short_name": "kub",
    "is_special_procedure": false
  },
  {
    "id": 3,
    "name": "Chest",
    "short_name": "cst",
    "is_special_procedure": false
  },
  {
    "id": 4,
    "name": "Left Chest",
    "short_name": "lcst",
    "is_special_procedure": false
  },
  {
    "id": 5,
    "name": "Right Chest",
    "short_name": "rcst",
    "is_special_procedure": false
  },
  {
    "id": 6,
    "name": "Cervical Spine",
    "short_name": "csp",
    "is_special_procedure": false
  },
  {
    "id": 7,
    "name": "Dorsal Spine",
    "short_name": "dsp",
    "is_special_procedure": false
  },
  {
    "id": 8,
    "name": "Lumbar Spine",
    "short_name": "lsp",
    "is_special_procedure": false
  },
  {
    "id": 9,
    "name": "Dorso-Lumbar Spine",
    "short_name": "dlsp",
    "is_special_procedure": false
  },
  {
    "id": 10,
    "name": "PBH / Hip",
    "short_name": "pbh",
    "is_special_procedure": false
  },
  {
    "id": 11,
    "name": "Left Hip",
    "short_name": "lhip",
    "is_special_procedure": false
  },
  {
    "id": 12,
    "name": "Right Hip",
    "short_name": "rhip",
    "is_special_procedure": false
  },
  {
    "id": 13,
    "name": "Sacroiliac Joints",
    "short_name": "sac",
    "is_special_procedure": false
  },
  {
    "id": 14,
    "name": "Both Knee",
    "short_name": "bknee",
    "is_special_procedure": false
  },
  {
    "id": 15,
    "name": "Left Knee",
    "short_name": "lknee",
    "is_special_procedure": false
  },
  {
    "id": 16,
    "name": "Right Knee",
    "short_name": "rknee",
    "is_special_procedure": false
  },
  {
    "id": 17,
    "name": "Left Ankle",
    "short_name": "lank",
    "is_special_procedure": false
  },
  {
    "id": 18,
    "name": "Right Ankle",
    "short_name": "rank",
    "is_special_procedure": false
  },
  {
    "id": 19,
    "name": "Both Ankle",
    "short_name": "bank",
    "is_special_procedure": false
  },
  {
    "id": 20,
    "name": "Left Shoulder",
    "short_name": "ls",
    "is_special_procedure": false
  },
  {
    "id": 21,
    "name": "Right Shoulder",
    "short_name": "rs",
    "is_special_procedure": false
  },
  {
    "id": 22,
    "name": "Both Shoulder",
    "short_name": "bs",
    "is_special_procedure": false
  },
  {
    "id": 23,
    "name": "Left Elbow",
    "short_name": "le",
    "is_special_procedure": false
  },
  {
    "id": 24,
    "name": "Right Elbow",
    "short_name": "re",
    "is_special_procedure": false
  },
  {
    "id": 25,
    "name": "Both Elbow",
    "short_name": "be",
    "is_special_procedure": false
  },
  {
    "id": 26,
    "name": "Left Wrist",
    "short_name": "lw",
    "is_special_procedure": false
  },
  {
    "id": 27,
    "name": "Right Wrist",
    "short_name": "rw",
    "is_special_procedure": false
  },
  {
    "id": 28,
    "name": "Both Wrist",
    "short_name": "bw",
    "is_special_procedure": false
  },
  {
    "id": 29,
    "name": "Paranasal (PNS)",
    "short_name": "pns",
    "is_special_procedure": false
  },
  {
    "id": 30,
    "name": "Left Arm",
    "short_name": "la",
    "is_special_procedure": false
  },
  {
    "id": 31,
    "name": "Right Arm",
    "short_name": "ra",
    "is_special_procedure": false
  },
  {
    "id": 32,
    "name": "Both Arms",
    "short_name": "ba",
    "is_special_procedure": false
  },
  {
    "id": 33,
    "name": "Coccyx",
    "short_name": "coc",
    "is_special_procedure": false
  },
  {
    "id": 34,
    "name": "Finger",
    "short_name": "f",
    "is_special_procedure": false
  },
  {
    "id": 35,
    "name": "Both Feet",
    "short_name": "bft",
    "is_special_procedure": false
  },
  {
    "id": 36,
    "name": "Left Foot",
    "short_name": "lft",
    "is_special_procedure": false
  },
  {
    "id": 37,
    "name": "Right Foot",
    "short_name": "rft",
    "is_special_procedure": false
  },
  {
    "id": 38,
    "name": "Left Forearm",
    "short_name": "lfor",
    "is_special_procedure": false
  },
  {
    "id": 39,
    "name": "Right Forearm",
    "short_name": "rfor",
    "is_special_procedure": false
  },
  {
    "id": 40,
    "name": "Both Forearms",
    "short_name": "bfor",
    "is_special_procedure": false
  },
  {
    "id": 41,
    "name": "Left Hand",
    "short_name": "lhd",
    "is_special_procedure": false
  },
  {
    "id": 42,
    "name": "Right Hand",
    "short_name": "rhd",
    "is_special_procedure": false
  },
  {
    "id": 43,
    "name": "Both Hands",
    "short_name": "bhd",
    "is_special_procedure": false
  },
  {
    "id": 44,
    "name": "Left Leg",
    "short_name": "lleg",
    "is_special_procedure": false
  },
  {
    "id": 45,
    "name": "Right Leg",
    "short_name": "rleg",
    "is_special_procedure": false
  },
  {
    "id": 46,
    "name": "Both Legs",
    "short_name": "bleg",
    "is_special_procedure": false
  },
  {
    "id": 47,
    "name": "Left Mastoid",
    "short_name": "lm",
    "is_special_procedure": false
  },
  {
    "id": 48,
    "name": "Right Mastoid",
    "short_name": "rm",
    "is_special_procedure": false
  },
  {
    "id": 49,
    "name": "Both Mastoids",
    "short_name": "bm",
    "is_special_procedure": false
  },
  {
    "id": 50,
    "name": "Nasal Bones",
    "short_name": "nb",
    "is_special_procedure": false
  },
  {
    "id": 51,
    "name": "Skull",
    "short_name": "skl",
    "is_special_procedure": false
  },
  {
    "id": 52,
    "name": "Left Thigh",
    "short_name": "ltgh",
    "is_special_procedure": false
  },
  {
    "id": 53,
    "name": "Right Thigh",
    "short_name": "rtgh",
    "is_special_procedure": false
  },
  {
    "id": 54,
    "name": "Both Thighs",
    "short_name": "btgh",
    "is_special_procedure": false
  },
  {
    "id": 55,
    "name": "Left Thumb",
    "short_name": "lth",
    "is_special_procedure": false
  },
  {
    "id": 56,
    "name": "Right Thumb",
    "short_name": "rth",
    "is_special_procedure": false
  },
  {
    "id": 57,
    "name": "Both Thumbs",
    "short_name": "bth",
    "is_special_procedure": false
  },
  {
    "id": 58,
    "name": "Cologram",
    "short_name": "colo",
    "is_special_procedure": true
  },
  {
    "id": 59,
    "name": "HSG",
    "short_name": "hsg",
    "is_special_procedure": true
  },
  {
    "id": 60,
    "name": "MCU",
    "short_name": "mcu",
    "is_special_procedure": true
  },
  {
    "id": 61,
    "name": "RGU",
    "short_name": "rgu",
    "is_special_procedure": true
  },
  {
    "id": 62,
    "name": "DRU",
    "short_name": "dru",
    "is_special_procedure": true
  },
  {
    "id": 63,
    "name": "IVP",
    "short_name": "ivp",
    "is_special_procedure": true
  },
  {
    "id": 64,
    "name": "Barium",
    "short_name": "bar",
    "is_special_procedure": true
  },
  {
    "id": 65,
    "name": "Neck",
    "short_name": "nck",
    "is_special_procedure": false
  },
  {
    "id": 66,
    "name": "Adenoids",
    "short_name": "ade",
    "is_special_procedure": false
  },
  {
    "id": 67,
    "name": "Apicogram",
    "short_name": "api",
    "is_special_procedure": false
  },
  {
    "id": 68,
    "name": "Sinogram",
    "short_name": "sin",
    "is_special_procedure": true
  },
  {
    "id": 69,
    "name": "Mandible",
    "short_name": "md",
    "is_special_procedure": false
  },
  {
    "id": 70,
    "name": "Left TM Joint",
    "short_name": "ltmj",
    "is_special_procedure": false
  },
  {
    "id": 71,
    "name": "Right TM Joint",
    "short_name": "rtmj",
    "is_special_procedure": false
  },
  {
    "id": 72,
    "name": "Both TM Joints",
    "short_name": "btmj",
    "is_special_procedure": false
  },
  {
    "id": 73,
    "name": "Mammography",
    "short_name": "mammo",
    "is_special_procedure": true
  },
  {
    "id": 74,
    "name": "OTHER",
    "short_name": "other",
    "is_special_procedure": false
  },
  {
    "id": 75,
    "name": "Abdomen Barium Enema",
    "short_name": "Abdomen Barium Enema",
    "is_special_procedure": true
  },
  {
    "id": 76,
    "name": "Abdomen Gallbladder",
    "short_name": "Abdomen Gallbladder",
    "is_special_procedure": false
  },
  {
    "id": 77,
    "name": "Abdomen HSG  (Hysterosalpingography)",
    "short_name": "Abdomen HSG  (Hysterosalpingography)",
    "is_special_procedure": true
  },
  {
    "id": 78,
    "name": "Abdomen Intestine",
    "short_name": "Abdomen Intestine",
    "is_special_procedure": false
  },
  {
    "id": 79,
    "name": "Abdomen IVP (Intravenous Pyelogram)",
    "short_name": "Abdomen IVP (Intravenous Pyelogram)",
    "is_special_procedure": true
  },
  {
    "id": 80,
    "name": "Abdomen Pediatric",
    "short_name": "Abdomen Pediatric",
    "is_special_procedure": false
  },
  {
    "id": 81,
    "name": "Ankle",
    "short_name": "Ankle",
    "is_special_procedure": false
  },
  {
    "id": 82,
    "name": "Calcaneus",
    "short_name": "Calcaneus",
    "is_special_procedure": false
  },
  {
    "id": 83,
    "name": "Left Calcaneus",
    "short_name": "Left Calcaneus",
    "is_special_procedure": false
  },
  {
    "id": 84,
    "name": "Right Calcaneus ",
    "short_name": "Right Calcaneus ",
    "is_special_procedure": false
  },
  {
    "id": 85,
    "name": "Both Calcaneus ",
    "short_name": "Both Calcaneus ",
    "is_special_procedure": false
  },
  {
    "id": 86,
    "name": "Both Foot",
    "short_name": "Both Foot",
    "is_special_procedure": false
  },
  {
    "id": 87,
    "name": "Foot",
    "short_name": "Foot",
    "is_special_procedure": false
  },
  {
    "id": 88,
    "name": "Big / First Toe Left Foot",
    "short_name": "Big / First Toe Left Foot",
    "is_special_procedure": false
  },
  {
    "id": 89,
    "name": "Big / First Toe Right Foot",
    "short_name": "Big / First Toe Right Foot",
    "is_special_procedure": false
  },
  {
    "id": 90,
    "name": "Big / First Toe both Foot / Feet",
    "short_name": "Big / First Toe both Foot / Feet",
    "is_special_procedure": false
  },
  {
    "id": 91,
    "name": "Long / Second Toe Left Foot",
    "short_name": "Long / Second Toe Left Foot",
    "is_special_procedure": false
  },
  {
    "id": 92,
    "name": "Long / Second Toe Right Foot",
    "short_name": "Long / Second Toe Right Foot",
    "is_special_procedure": false
  },
  {
    "id": 93,
    "name": "Long / Second Toe both Foot / Feet",
    "short_name": "Long / Second Toe both Foot / Feet",
    "is_special_procedure": false
  },
  {
    "id": 94,
    "name": "Middle / Third Toe Left Foot",
    "short_name": "Middle / Third Toe Left Foot",
    "is_special_procedure": false
  },
  {
    "id": 95,
    "name": "Middle / Third Toe Right Foot",
    "short_name": "Middle / Third Toe Right Foot",
    "is_special_procedure": false
  },
  {
    "id": 96,
    "name": "Middle / Third Toe both Foot / Feet",
    "short_name": "Middle / Third Toe both Foot / Feet",
    "is_special_procedure": false
  },
  {
    "id": 97,
    "name": "Ring / Fourth Toe Left Foot",
    "short_name": "Ring / Fourth Toe Left Foot",
    "is_special_procedure": false
  },
  {
    "id": 98,
    "name": "Ring / Fourth Toe Right Foot",
    "short_name": "Ring / Fourth Toe Right Foot",
    "is_special_procedure": false
  },
  {
    "id": 99,
    "name": "Ring / Fourth Toe both Foot / Feet",
    "short_name": "Ring / Fourth Toe both Foot / Feet",
    "is_special_procedure": false
  },
  {
    "id": 100,
    "name": "Little / Fifth Toe Left Foot",
    "short_name": "Little / Fifth Toe Left Foot",
    "is_special_procedure": false
  },
  {
    "id": 101,
    "name": "Little / Fifth Toe Right Foot",
    "short_name": "Little / Fifth Toe Right Foot",
    "is_special_procedure": false
  },
  {
    "id": 102,
    "name": "Little / Fifth Toe both Foot / Feet",
    "short_name": "Little / Fifth Toe both Foot / Feet",
    "is_special_procedure": false
  },
  {
    "id": 103,
    "name": "Toe Left Foot",
    "short_name": "Toe Left Foot",
    "is_special_procedure": false
  },
  {
    "id": 104,
    "name": "Toe Right Foot",
    "short_name": "Toe Right Foot",
    "is_special_procedure": false
  },
  {
    "id": 105,
    "name": "Toe both Foot / Feet",
    "short_name": "Toe both Foot / Feet",
    "is_special_procedure": false
  },
  {
    "id": 106,
    "name": "Toe",
    "short_name": "Toe",
    "is_special_procedure": false
  },
  {
    "id": 107,
    "name": "Heel",
    "short_name": "Heel",
    "is_special_procedure": false
  },
  {
    "id": 108,
    "name": "Left Heel",
    "short_name": "Left Heel",
    "is_special_procedure": false
  },
  {
    "id": 109,
    "name": "Right Heel",
    "short_name": "Right Heel",
    "is_special_procedure": false
  },
  {
    "id": 110,
    "name": "Both Heels",
    "short_name": "Both Heels",
    "is_special_procedure": false
  },
  {
    "id": 111,
    "name": "Skull Mandible",
    "short_name": "Skull Mandible",
    "is_special_procedure": false
  },
  {
    "id": 112,
    "name": "Skull Nasal",
    "short_name": "Skull Nasal",
    "is_special_procedure": false
  },
  {
    "id": 113,
    "name": "Nasal Septum",
    "short_name": "Nasal Septum",
    "is_special_procedure": false
  },
  {
    "id": 114,
    "name": "Left Skull",
    "short_name": "Left Skull",
    "is_special_procedure": false
  },
  {
    "id": 115,
    "name": "Right Skull",
    "short_name": "Right Skull",
    "is_special_procedure": false
  },
  {
    "id": 116,
    "name": "Skull Cranium",
    "short_name": "Skull Cranium",
    "is_special_procedure": false
  },
  {
    "id": 117,
    "name": "Skull Facial",
    "short_name": "Skull Facial",
    "is_special_procedure": false
  },
  {
    "id": 118,
    "name": "Skull Sinus",
    "short_name": "Skull Sinus",
    "is_special_procedure": false
  },
  {
    "id": 119,
    "name": "Skull Zygoma",
    "short_name": "Skull Zygoma",
    "is_special_procedure": false
  },
  {
    "id": 120,
    "name": "Elbow",
    "short_name": "Elbow",
    "is_special_procedure": false
  },
  {
    "id": 121,
    "name": "Hand",
    "short_name": "Hand",
    "is_special_procedure": false
  },
  {
    "id": 122,
    "name": "Left Hand BMD (Bone Mineral Density)",
    "short_name": "Left Hand BMD (Bone Mineral Density)",
    "is_special_procedure": false
  },
  {
    "id": 123,
    "name": "Right Hand BMD (Bone Mineral Density)",
    "short_name": "Right Hand BMD (Bone Mineral Density)",
    "is_special_procedure": false
  },
  {
    "id": 276,
    "name": "Cholangiogram",
    "short_name": "Cholangiogram",
    "is_special_procedure": false
  },
  {
    "id": 124,
    "name": "Both Hands BMD (Bone Mineral Density)",
    "short_name": "Both Hands BMD (Bone Mineral Density)",
    "is_special_procedure": false
  },
  {
    "id": 125,
    "name": "Hand BMD (Bone Mineral Density)",
    "short_name": "Hand BMD (Bone Mineral Density)",
    "is_special_procedure": false
  },
  {
    "id": 126,
    "name": "Thumb Finger Left Hand",
    "short_name": "Thumb Finger Left Hand",
    "is_special_procedure": false
  },
  {
    "id": 127,
    "name": "Index Finger Left Hand",
    "short_name": "Index Finger Left Hand",
    "is_special_procedure": false
  },
  {
    "id": 128,
    "name": "Middle Finger Left Hand",
    "short_name": "Middle Finger Left Hand",
    "is_special_procedure": false
  },
  {
    "id": 129,
    "name": "Ring Finger Left Hand",
    "short_name": "Ring Finger Left Hand",
    "is_special_procedure": false
  },
  {
    "id": 130,
    "name": "Little Finger Left Hand",
    "short_name": "Little Finger Left Hand",
    "is_special_procedure": false
  },
  {
    "id": 131,
    "name": "Thumb Finger Right Hand",
    "short_name": "Thumb Finger Right Hand",
    "is_special_procedure": false
  },
  {
    "id": 132,
    "name": "Index Finger Right Hand",
    "short_name": "Index Finger Right Hand",
    "is_special_procedure": false
  },
  {
    "id": 133,
    "name": "Middle Finger Right Hand",
    "short_name": "Middle Finger Right Hand",
    "is_special_procedure": false
  },
  {
    "id": 134,
    "name": "Ring Finger Right Hand",
    "short_name": "Ring Finger Right Hand",
    "is_special_procedure": false
  },
  {
    "id": 135,
    "name": "Little Finger Right Hand",
    "short_name": "Little Finger Right Hand",
    "is_special_procedure": false
  },
  {
    "id": 136,
    "name": "Thumb Finger Both Hands",
    "short_name": "Thumb Finger Both Hands",
    "is_special_procedure": false
  },
  {
    "id": 137,
    "name": "Index Finger Both Hands",
    "short_name": "Index Finger Both Hands",
    "is_special_procedure": false
  },
  {
    "id": 138,
    "name": "Middle Finger Both Hands",
    "short_name": "Middle Finger Both Hands",
    "is_special_procedure": false
  },
  {
    "id": 139,
    "name": "Ring Finger Both Hands",
    "short_name": "Ring Finger Both Hands",
    "is_special_procedure": false
  },
  {
    "id": 140,
    "name": "Little Finger Both Hands",
    "short_name": "Little Finger Both Hands",
    "is_special_procedure": false
  },
  {
    "id": 141,
    "name": "Wrist",
    "short_name": "Wrist",
    "is_special_procedure": false
  },
  {
    "id": 142,
    "name": "Scaphoid",
    "short_name": "Scaphoid",
    "is_special_procedure": false
  },
  {
    "id": 143,
    "name": "Scaphoid Left Wrist",
    "short_name": "Scaphoid Left Wrist",
    "is_special_procedure": false
  },
  {
    "id": 144,
    "name": "Scaphoid Right Wrist",
    "short_name": "Scaphoid Right Wrist",
    "is_special_procedure": false
  },
  {
    "id": 145,
    "name": "Scaphoid Both Wrists",
    "short_name": "Scaphoid Both Wrists",
    "is_special_procedure": false
  },
  {
    "id": 146,
    "name": "Both Hips",
    "short_name": "Both Hips",
    "is_special_procedure": false
  },
  {
    "id": 147,
    "name": "Multiple Studies",
    "short_name": "Multiple Studies",
    "is_special_procedure": false
  },
  {
    "id": 148,
    "name": "Pelvis and Both Hips (PBH)",
    "short_name": "Pelvis and Both Hips (PBH)",
    "is_special_procedure": false
  },
  {
    "id": 149,
    "name": "Pelvis",
    "short_name": "Pelvis",
    "is_special_procedure": false
  },
  {
    "id": 150,
    "name": "Knee",
    "short_name": "Knee",
    "is_special_procedure": false
  },
  {
    "id": 151,
    "name": "Knee Patella",
    "short_name": "Knee Patella",
    "is_special_procedure": false
  },
  {
    "id": 152,
    "name": "Right Orbit",
    "short_name": "Right Orbit",
    "is_special_procedure": false
  },
  {
    "id": 153,
    "name": "Left Orbit",
    "short_name": "Left Orbit",
    "is_special_procedure": false
  },
  {
    "id": 154,
    "name": "Orbit",
    "short_name": "Orbit",
    "is_special_procedure": false
  },
  {
    "id": 155,
    "name": "Femur",
    "short_name": "Femur",
    "is_special_procedure": false
  },
  {
    "id": 156,
    "name": "Left Femur",
    "short_name": "Left Femur",
    "is_special_procedure": false
  },
  {
    "id": 157,
    "name": "Right Femur",
    "short_name": "Right Femur",
    "is_special_procedure": false
  },
  {
    "id": 158,
    "name": "Both Femurs",
    "short_name": "Both Femurs",
    "is_special_procedure": false
  },
  {
    "id": 159,
    "name": "Pharynx / larynx",
    "short_name": "Pharynx / larynx",
    "is_special_procedure": false
  },
  {
    "id": 160,
    "name": "Fibula / Tibia",
    "short_name": "Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 161,
    "name": "Left Fibula / Tibia",
    "short_name": "Left Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 162,
    "name": "STN (Soft Tissue Neck)",
    "short_name": "STN (Soft Tissue Neck)",
    "is_special_procedure": false
  },
  {
    "id": 163,
    "name": "Right Fibula / Tibia",
    "short_name": "Right Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 164,
    "name": "Both Fibula / Tibia",
    "short_name": "Both Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 165,
    "name": "Nasopharynx",
    "short_name": "Nasopharynx",
    "is_special_procedure": false
  },
  {
    "id": 166,
    "name": "LLI Leg Upright (Long Length Imaging)",
    "short_name": "LLI Leg Upright (Long Length Imaging)",
    "is_special_procedure": false
  },
  {
    "id": 167,
    "name": "LLI Leg Supine (Long Length Imaging)",
    "short_name": "LLI Leg Supine (Long Length Imaging)",
    "is_special_procedure": false
  },
  {
    "id": 168,
    "name": "Mastoid Process",
    "short_name": "Mastoid Process",
    "is_special_procedure": false
  },
  {
    "id": 169,
    "name": "Left Shoulder Clavicle",
    "short_name": "Left Shoulder Clavicle",
    "is_special_procedure": false
  },
  {
    "id": 170,
    "name": "Right Shoulder Clavicle",
    "short_name": "Right Shoulder Clavicle",
    "is_special_procedure": false
  },
  {
    "id": 171,
    "name": "Both Shoulder Clavicles",
    "short_name": "Both Shoulder Clavicles",
    "is_special_procedure": false
  },
  {
    "id": 172,
    "name": "Right Shoulder Scapula",
    "short_name": "Right Shoulder Scapula",
    "is_special_procedure": false
  },
  {
    "id": 173,
    "name": "Left Shoulder Scapula",
    "short_name": "Left Shoulder Scapula",
    "is_special_procedure": false
  },
  {
    "id": 174,
    "name": "Both Shoulder Scapula",
    "short_name": "Both Shoulder Scapula",
    "is_special_procedure": false
  },
  {
    "id": 175,
    "name": "Dental Panoramic Cranium",
    "short_name": "Dental Panoramic Cranium",
    "is_special_procedure": false
  },
  {
    "id": 176,
    "name": "Dental CEPH (Cephalometric Analysis) Cranium",
    "short_name": "Dental CEPH (Cephalometric Analysis) Cranium",
    "is_special_procedure": false
  },
  {
    "id": 177,
    "name": "Both SM Bone (Sesamoid)",
    "short_name": "Both SM Bone (Sesamoid)",
    "is_special_procedure": false
  },
  {
    "id": 178,
    "name": "Left SM Bone (Sesamoid)",
    "short_name": "Left SM Bone (Sesamoid)",
    "is_special_procedure": false
  },
  {
    "id": 179,
    "name": "Right SM Bone (Sesamoid)",
    "short_name": "Right SM Bone (Sesamoid)",
    "is_special_procedure": false
  },
  {
    "id": 180,
    "name": "Both Humerus",
    "short_name": "Both Humerus",
    "is_special_procedure": false
  },
  {
    "id": 181,
    "name": "LLI Spine Supine (Long Length Imaging)",
    "short_name": "LLI Spine Supine (Long Length Imaging)",
    "is_special_procedure": false
  },
  {
    "id": 182,
    "name": "LLI Spine Uprght (Long Length Imaging)",
    "short_name": "LLI Spine Uprght (Long Length Imaging)",
    "is_special_procedure": false
  },
  {
    "id": 183,
    "name": "Right Humerus",
    "short_name": "Right Humerus",
    "is_special_procedure": false
  },
  {
    "id": 184,
    "name": "Left Humerus",
    "short_name": "Left Humerus",
    "is_special_procedure": false
  },
  {
    "id": 185,
    "name": "Spine Coccyx",
    "short_name": "Spine Coccyx",
    "is_special_procedure": false
  },
  {
    "id": 186,
    "name": "Forearm",
    "short_name": "Forearm",
    "is_special_procedure": false
  },
  {
    "id": 187,
    "name": "Spine Sacrum",
    "short_name": "Spine Sacrum",
    "is_special_procedure": false
  },
  {
    "id": 188,
    "name": "Ribs Right Chest",
    "short_name": "Ribs Right Chest",
    "is_special_procedure": false
  },
  {
    "id": 189,
    "name": "Thoracic Spine",
    "short_name": "Thoracic Spine",
    "is_special_procedure": false
  },
  {
    "id": 190,
    "name": "Ribs Left Chest",
    "short_name": "Ribs Left Chest",
    "is_special_procedure": false
  },
  {
    "id": 191,
    "name": "TL (Thoracolumbar) Spine",
    "short_name": "TL (Thoracolumbar) Spine",
    "is_special_procedure": false
  },
  {
    "id": 192,
    "name": "Thorax Sternum",
    "short_name": "Thorax Sternum",
    "is_special_procedure": false
  },
  {
    "id": 193,
    "name": "Thorax Ribs (Upper)",
    "short_name": "Thorax Ribs (Upper)",
    "is_special_procedure": false
  },
  {
    "id": 194,
    "name": "Sacrum Coccyx",
    "short_name": "Sacrum Coccyx",
    "is_special_procedure": false
  },
  {
    "id": 195,
    "name": "Thorax Ribs (Lower)",
    "short_name": "Thorax Ribs (Lower)",
    "is_special_procedure": false
  },
  {
    "id": 196,
    "name": "Thorax",
    "short_name": "Thorax",
    "is_special_procedure": false
  },
  {
    "id": 197,
    "name": "BMFT (Barium Meal Follow Through)",
    "short_name": "BMFT (Barium Meal Follow Through)",
    "is_special_procedure": true
  },
  {
    "id": 198,
    "name": "Contrast Enema",
    "short_name": "Contrast Enema",
    "is_special_procedure": true
  },
  {
    "id": 199,
    "name": "Esophagus",
    "short_name": "Esophagus",
    "is_special_procedure": false
  },
  {
    "id": 200,
    "name": "Scanogram",
    "short_name": "Scanogram",
    "is_special_procedure": true
  },
  {
    "id": 201,
    "name": "Chest Portable",
    "short_name": "Chest Portable",
    "is_special_procedure": false
  },
  {
    "id": 202,
    "name": "Scanogram Both Lower Limbs",
    "short_name": "Scanogram Both Lower Limbs",
    "is_special_procedure": true
  },
  {
    "id": 203,
    "name": "Chest Pediatric",
    "short_name": "Chest Pediatric",
    "is_special_procedure": false
  },
  {
    "id": 204,
    "name": "Scanogram Both Lower Limbs Standing",
    "short_name": "Scanogram Both Lower Limbs Standing",
    "is_special_procedure": true
  },
  {
    "id": 205,
    "name": "Scanogram Left Lower Limb",
    "short_name": "Scanogram Left Lower Limb",
    "is_special_procedure": true
  },
  {
    "id": 206,
    "name": "Scanogram Left Lower Limb Standing",
    "short_name": "Scanogram Left Lower Limb Standing",
    "is_special_procedure": true
  },
  {
    "id": 207,
    "name": "Scanogram Right Lower Limb",
    "short_name": "Scanogram Right Lower Limb",
    "is_special_procedure": true
  },
  {
    "id": 208,
    "name": "Scanogram Right Lower Limb Standing",
    "short_name": "Scanogram Right Lower Limb Standing",
    "is_special_procedure": true
  },
  {
    "id": 209,
    "name": "Distal Colostogram",
    "short_name": "Distal Colostogram",
    "is_special_procedure": true
  },
  {
    "id": 210,
    "name": "Fistulogram",
    "short_name": "Fistulogram",
    "is_special_procedure": true
  },
  {
    "id": 211,
    "name": "Loopogram Procedure",
    "short_name": "Loopogram Procedure",
    "is_special_procedure": true
  },
  {
    "id": 212,
    "name": "Retrograde Urethrography (RUG)",
    "short_name": "Retrograde Urethrography (RUG)",
    "is_special_procedure": true
  },
  {
    "id": 213,
    "name": "Ascending Urethrography (ASU)",
    "short_name": "Ascending Urethrography (ASU)",
    "is_special_procedure": true
  },
  {
    "id": 214,
    "name": "Urethrography (Urethrogram)",
    "short_name": "Urethrography (Urethrogram)",
    "is_special_procedure": true
  },
  {
    "id": 215,
    "name": "Micturating Cystourethrography (MCU )",
    "short_name": "Micturating Cystourethrography (MCU )",
    "is_special_procedure": true
  },
  {
    "id": 216,
    "name": "Voiding cystourethrography (VCUG)",
    "short_name": "Voiding cystourethrography (VCUG)",
    "is_special_procedure": true
  },
  {
    "id": 217,
    "name": "Abdomen Standing",
    "short_name": "Abdomen Standing",
    "is_special_procedure": false
  },
  {
    "id": 218,
    "name": "SI Joints (Sacroiliac)",
    "short_name": "SI Joints (Sacroiliac)",
    "is_special_procedure": false
  },
  {
    "id": 219,
    "name": "Left Knee Standing",
    "short_name": "Left Knee Standing",
    "is_special_procedure": false
  },
  {
    "id": 220,
    "name": "Both AC Joint (Acromio Clavicular)",
    "short_name": "Both AC Joint (Acromio Clavicular)",
    "is_special_procedure": false
  },
  {
    "id": 221,
    "name": "Right Knee Standing",
    "short_name": "Right Knee Standing",
    "is_special_procedure": false
  },
  {
    "id": 222,
    "name": "Right AC Joint (Acromio Clavicular)",
    "short_name": "Right AC Joint (Acromio Clavicular)",
    "is_special_procedure": false
  },
  {
    "id": 223,
    "name": "Left AC Joint (Acromio Clavicular)",
    "short_name": "Left AC Joint (Acromio Clavicular)",
    "is_special_procedure": false
  },
  {
    "id": 224,
    "name": "LS Spine (Lumbo Sacral)",
    "short_name": "LS Spine (Lumbo Sacral)",
    "is_special_procedure": false
  },
  {
    "id": 225,
    "name": "Thoracic Inlet",
    "short_name": "Thoracic Inlet",
    "is_special_procedure": false
  },
  {
    "id": 226,
    "name": "Both Knee Standing",
    "short_name": "Both Knee Standing",
    "is_special_procedure": false
  },
  {
    "id": 227,
    "name": "Bilateral Styloid Process",
    "short_name": "Bilateral Styloid Process",
    "is_special_procedure": false
  },
  {
    "id": 228,
    "name": "Left Styloid Process",
    "short_name": "Left Styloid Process",
    "is_special_procedure": false
  },
  {
    "id": 229,
    "name": "Right Styloid Process",
    "short_name": "Right Styloid Process",
    "is_special_procedure": false
  },
  {
    "id": 230,
    "name": "Left Ankle and Foot",
    "short_name": "Left Ankle and Foot",
    "is_special_procedure": false
  },
  {
    "id": 231,
    "name": "Right Ankle and Foot",
    "short_name": "Right Ankle and Foot",
    "is_special_procedure": false
  },
  {
    "id": 232,
    "name": "Both Ankel and Foot",
    "short_name": "Both Ankel and Foot",
    "is_special_procedure": false
  },
  {
    "id": 233,
    "name": "Both Lower Limbs",
    "short_name": "Both Lower Limbs",
    "is_special_procedure": false
  },
  {
    "id": 234,
    "name": "Both Lower Limbs Standing (Erect)",
    "short_name": "Both Lower Limbs Standing (Erect)",
    "is_special_procedure": false
  },
  {
    "id": 235,
    "name": "Left Lower Limbs",
    "short_name": "Left Lower Limbs",
    "is_special_procedure": false
  },
  {
    "id": 236,
    "name": "Left Lower Limbs Standing (Erect)",
    "short_name": "Left Lower Limbs Standing (Erect)",
    "is_special_procedure": false
  },
  {
    "id": 237,
    "name": "Right Lower Limbs",
    "short_name": "Right Lower Limbs",
    "is_special_procedure": false
  },
  {
    "id": 238,
    "name": "Right Lower Limbs Standing (Erect)",
    "short_name": "Right Lower Limbs Standing (Erect)",
    "is_special_procedure": false
  },
  {
    "id": 239,
    "name": "Left Knee and Femur",
    "short_name": "Left Knee and Femur",
    "is_special_procedure": false
  },
  {
    "id": 240,
    "name": "Left Knee, Hip and Femur",
    "short_name": "Left Knee, Hip and Femur",
    "is_special_procedure": false
  },
  {
    "id": 241,
    "name": "Left Hip and Femur",
    "short_name": "Left Hip and Femur",
    "is_special_procedure": false
  },
  {
    "id": 242,
    "name": "Right Knee and Femur",
    "short_name": "Right Knee and Femur",
    "is_special_procedure": false
  },
  {
    "id": 243,
    "name": "Right Knee, Hip and Femur",
    "short_name": "Right Knee, Hip and Femur",
    "is_special_procedure": false
  },
  {
    "id": 244,
    "name": "Right Hip and Femur",
    "short_name": "Right Hip and Femur",
    "is_special_procedure": false
  },
  {
    "id": 245,
    "name": "Both Knee and Femur",
    "short_name": "Both Knee and Femur",
    "is_special_procedure": false
  },
  {
    "id": 246,
    "name": "Both Knee, Hip and Femur",
    "short_name": "Both Knee, Hip and Femur",
    "is_special_procedure": false
  },
  {
    "id": 247,
    "name": "Both Hip and Femur",
    "short_name": "Both Hip and Femur",
    "is_special_procedure": false
  },
  {
    "id": 248,
    "name": "Chest and Abdomen",
    "short_name": "Chest and Abdomen",
    "is_special_procedure": false
  },
  {
    "id": 249,
    "name": "Full Body",
    "short_name": "Full Body",
    "is_special_procedure": false
  },
  {
    "id": 250,
    "name": "Left Ankle and Fibula / Tibia",
    "short_name": "Left Ankle and Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 251,
    "name": "Right Ankle and Fibula / Tibia",
    "short_name": "Right Ankle and Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 252,
    "name": "Both Ankle and Fibula / Tibia",
    "short_name": "Both Ankle and Fibula / Tibia",
    "is_special_procedure": false
  },
  {
    "id": 253,
    "name": "Left Shoulder and Humerus",
    "short_name": "Left Shoulder and Humerus",
    "is_special_procedure": false
  },
  {
    "id": 254,
    "name": "Right Shoulder and Humerus",
    "short_name": "Right Shoulder and Humerus",
    "is_special_procedure": false
  },
  {
    "id": 255,
    "name": "Both Shoulder and Humerus",
    "short_name": "Both Shoulder and Humerus",
    "is_special_procedure": false
  },
  {
    "id": 256,
    "name": "Left Hand and Wrist",
    "short_name": "Left Hand and Wrist",
    "is_special_procedure": false
  },
  {
    "id": 257,
    "name": "Right Hand and Wrist",
    "short_name": "Right Hand and Wrist",
    "is_special_procedure": false
  },
  {
    "id": 258,
    "name": "Both Hands and Wrist",
    "short_name": "Both Hands and Wrist",
    "is_special_procedure": false
  },
  {
    "id": 259,
    "name": "Lumbar Spine and PBH / HIP",
    "short_name": "Lumbar Spine and PBH / HIP",
    "is_special_procedure": false
  },
  {
    "id": 260,
    "name": "Left Shoulder and Cervical Spine",
    "short_name": "Left Shoulder and Cervical Spine",
    "is_special_procedure": false
  },
  {
    "id": 261,
    "name": "Right Shoulder and Cervical Spine",
    "short_name": "Right Shoulder and Cervical Spine",
    "is_special_procedure": false
  },
  {
    "id": 262,
    "name": "Both Shoulder and Cervical Spine",
    "short_name": "Both Shoulder and Cervical Spine",
    "is_special_procedure": false
  },
  {
    "id": 263,
    "name": "Skull Nasal and Mandible",
    "short_name": "Skull Nasal and Mandible",
    "is_special_procedure": false
  },
  {
    "id": 264,
    "name": "Bladder",
    "short_name": "Bladder",
    "is_special_procedure": false
  },
  {
    "id": 265,
    "name": "Both Hands with Wrists ",
    "short_name": "Both Hands with Wrists ",
    "is_special_procedure": false
  },
  {
    "id": 266,
    "name": "Foot with Ankle ",
    "short_name": "Foot with Ankle ",
    "is_special_procedure": false
  },
  {
    "id": 267,
    "name": "Right Foot With Ankle ",
    "short_name": "Right Foot With Ankle ",
    "is_special_procedure": false
  },
  {
    "id": 268,
    "name": "Left Foot with Ankle ",
    "short_name": "Left Foot with Ankle ",
    "is_special_procedure": false
  },
  {
    "id": 269,
    "name": "Infantogram ",
    "short_name": "Infantogram ",
    "is_special_procedure": true
  },
  {
    "id": 270,
    "name": "IVHRTOGRAM",
    "short_name": "IVHRTOGRAM",
    "is_special_procedure": true
  },
  {
    "id": 271,
    "name": "INVERTOGRAM",
    "short_name": "INVERTOGRAM",
    "is_special_procedure": true
  },
  {
    "id": 272,
    "name": "ECG",
    "short_name": "ECG",
    "is_special_procedure": false
  },
  {
    "id": 273,
    "name": "OPG",
    "short_name": "OPG",
    "is_special_procedure": true
  },
  {
    "id": 274,
    "name": "EEG",
    "short_name": "EEG",
    "is_special_procedure": true
  },
  {
    "id": 275,
    "name": "Animal Xray",
    "short_name": "Animal Xray",
    "is_special_procedure": true
  },
  {
    "id": 277,
    "name": "Cholongiogram",
    "short_name": "Cholongiogram",
    "is_special_procedure": true
  },
  {
    "id": 278,
    "name": "Dacryocystography",
    "short_name": "Dacryocystography",
    "is_special_procedure": true
  }
];

export const VIEWS_DATA: ViewItem[] = [
  {
    "id": 1,
    "name": "PA",
    "short_name": "pa"
  },
  {
    "id": 2,
    "name": "LATERAL",
    "short_name": "lat"
  },
  {
    "id": 3,
    "name": "AP ERECT",
    "short_name": "aper"
  },
  {
    "id": 4,
    "name": "SUPINE",
    "short_name": "sup"
  },
  {
    "id": 5,
    "name": "LORDOTIC",
    "short_name": "lor"
  },
  {
    "id": 6,
    "name": "LATERAL DECUBITUS",
    "short_name": "latdec"
  },
  {
    "id": 7,
    "name": "EXPIRATORY CHEST RADIOGRAPH",
    "short_name": "expchs"
  },
  {
    "id": 8,
    "name": "STERNUM LATERAL",
    "short_name": "strlat"
  },
  {
    "id": 9,
    "name": "STERNUM OBLIQUE",
    "short_name": "strob"
  },
  {
    "id": 10,
    "name": "RIBS AP",
    "short_name": "ribap"
  },
  {
    "id": 11,
    "name": "RIBS PA",
    "short_name": "ribpa"
  },
  {
    "id": 12,
    "name": "RIBS OBLIQUE",
    "short_name": "ribob"
  },
  {
    "id": 13,
    "name": "AP SUPINE",
    "short_name": "aps"
  },
  {
    "id": 14,
    "name": "PA SUPINE",
    "short_name": "pas"
  },
  {
    "id": 15,
    "name": "PA ERECT",
    "short_name": "paer"
  },
  {
    "id": 16,
    "name": "DORSAL DECUBITUS",
    "short_name": "dordec"
  },
  {
    "id": 17,
    "name": "PA PRONE",
    "short_name": "papro"
  },
  {
    "id": 18,
    "name": "OBLIQUE",
    "short_name": "ob"
  },
  {
    "id": 19,
    "name": "AP",
    "short_name": "ap"
  },
  {
    "id": 20,
    "name": "AP OBLIQUE",
    "short_name": "apob"
  },
  {
    "id": 21,
    "name": "PA OBLIQUE",
    "short_name": "paob"
  },
  {
    "id": 22,
    "name": "CERVICOTHORACIC (SWIMMER'S VIEW)",
    "short_name": "cer"
  },
  {
    "id": 23,
    "name": "AP OPEN MOUTH ODONTOID",
    "short_name": "apomod"
  },
  {
    "id": 24,
    "name": "AP CLOSED MOUTH ODONTOID (FUCHS VIEW)",
    "short_name": "apcmod"
  },
  {
    "id": 25,
    "name": "LATERAL FLEXION AND EXTENSION",
    "short_name": "latfne"
  },
  {
    "id": 26,
    "name": "OUTLET",
    "short_name": "out"
  },
  {
    "id": 27,
    "name": "INLET",
    "short_name": "in"
  },
  {
    "id": 28,
    "name": "OBLIQUE ACETABULAR (JUDET VIEW)",
    "short_name": "obace"
  },
  {
    "id": 29,
    "name": "FLAMINGO",
    "short_name": "flm"
  },
  {
    "id": 30,
    "name": "CLEMENTS-NAKAYAMA",
    "short_name": "cn"
  },
  {
    "id": 31,
    "name": "FROG LEG",
    "short_name": "fl"
  },
  {
    "id": 32,
    "name": "DUNN",
    "short_name": "dunn"
  },
  {
    "id": 33,
    "name": "VON ROSEN",
    "short_name": "vr"
  },
  {
    "id": 34,
    "name": "HORIZONTAL BEAM LATERAL",
    "short_name": "hobl"
  },
  {
    "id": 35,
    "name": "AP WEIGHT-BEARING",
    "short_name": "apwtb"
  },
  {
    "id": 36,
    "name": "INTERCONDYLAR",
    "short_name": "ic"
  },
  {
    "id": 37,
    "name": "ROSENBERG",
    "short_name": "rb"
  },
  {
    "id": 38,
    "name": "SKYLINE LAURINE",
    "short_name": "skyl"
  },
  {
    "id": 39,
    "name": "SKYLINE MERCHANT",
    "short_name": "skym"
  },
  {
    "id": 40,
    "name": "AP MORTISE",
    "short_name": "apm"
  },
  {
    "id": 41,
    "name": "AP STRESS",
    "short_name": "apstr"
  },
  {
    "id": 42,
    "name": "INTERNAL ROTATION",
    "short_name": "inr"
  },
  {
    "id": 43,
    "name": "EXTERNAL ROTATION",
    "short_name": "exr"
  },
  {
    "id": 44,
    "name": "SUPEROINFERIOR AXIAL",
    "short_name": "supinax"
  },
  {
    "id": 45,
    "name": "INFEROSUPERIOR AXIAL",
    "short_name": "insupax"
  },
  {
    "id": 46,
    "name": "MODIFIED TRAUMA AXIAL",
    "short_name": "modtrax"
  },
  {
    "id": 47,
    "name": "SUPINE LATERAL",
    "short_name": "suplat"
  },
  {
    "id": 48,
    "name": "MODIFIED SUPINE LATERAL",
    "short_name": "modsuplat"
  },
  {
    "id": 49,
    "name": "Y LATERAL",
    "short_name": "ylat"
  },
  {
    "id": 50,
    "name": "AP GLENOID (GRASHEY VIEW)",
    "short_name": "apg"
  },
  {
    "id": 51,
    "name": "APICAL OBLIQUE (GARTH VIEW)",
    "short_name": "aplob"
  },
  {
    "id": 52,
    "name": "HUMERUS (NECK) AP",
    "short_name": "humap"
  },
  {
    "id": 53,
    "name": "HUMERUS AXIAL (BICIPITAL GROOVE) (FISK VIEW)",
    "short_name": "humax"
  },
  {
    "id": 54,
    "name": "STRYKER NOTCH",
    "short_name": "strno"
  },
  {
    "id": 55,
    "name": "SUPRACONDYLAR AP",
    "short_name": "supcap"
  },
  {
    "id": 56,
    "name": "ACUTE FLEXION AP",
    "short_name": "acflap"
  },
  {
    "id": 57,
    "name": "COYLE'S",
    "short_name": "coy"
  },
  {
    "id": 58,
    "name": "EXTERNAL OBLIQUE",
    "short_name": "exob"
  },
  {
    "id": 59,
    "name": "MEDIAL OBLIQUE",
    "short_name": "medob"
  },
  {
    "id": 60,
    "name": "CARPAL TUNNEL",
    "short_name": "cpltnl"
  },
  {
    "id": 61,
    "name": "TRAPEZIUM",
    "short_name": "tzm"
  },
  {
    "id": 62,
    "name": "PISIFORM",
    "short_name": "pifrm"
  },
  {
    "id": 63,
    "name": "PA RADIAL DEVIATION",
    "short_name": "paraddev"
  },
  {
    "id": 64,
    "name": "CARPAL BRIDGE",
    "short_name": "carbr"
  },
  {
    "id": 65,
    "name": "PA ANGLED (CALDWELL VIEW)",
    "short_name": "paang"
  },
  {
    "id": 66,
    "name": "PARIETOCANTHAL (WATERS VIEW)",
    "short_name": "water"
  },
  {
    "id": 67,
    "name": "TRANSORAL PARIETOCANTHAL (OPEN MOUTH WATERS VIEW)",
    "short_name": "opmou"
  },
  {
    "id": 68,
    "name": "SUBMENTOVERTEX (SMV)",
    "short_name": "smv"
  },
  {
    "id": 69,
    "name": "DP",
    "short_name": "dp"
  },
  {
    "id": 70,
    "name": "WEIGHTBEARING AP",
    "short_name": "wap"
  },
  {
    "id": 71,
    "name": "WEIGHTBEARING LATERAL",
    "short_name": "wlat"
  },
  {
    "id": 72,
    "name": "DP OBLIQUE",
    "short_name": "dpob"
  },
  {
    "id": 73,
    "name": "BALL-CATCHER (NORGAARD VIEW)",
    "short_name": "ballcat"
  },
  {
    "id": 74,
    "name": "WATERS",
    "short_name": "waters"
  },
  {
    "id": 75,
    "name": "AXIAL",
    "short_name": "axial"
  },
  {
    "id": 76,
    "name": "AP AXIAL(TOWNE VIEW)",
    "short_name": "apaxial"
  },
  {
    "id": 77,
    "name": "PA AXIAL (CALDWELL VIEW)",
    "short_name": "paaxial"
  },
  {
    "id": 78,
    "name": "OCCIPITOMENTAL (WATERS VIEW)",
    "short_name": "owater"
  },
  {
    "id": 79,
    "name": "ACANTHIOPARIETAL (REVERSE WATERS VIEW)",
    "short_name": "acpa"
  },
  {
    "id": 80,
    "name": "OCCIPITOMENTAL 30º (TITTERINGTON VIEW)",
    "short_name": "o30"
  },
  {
    "id": 81,
    "name": "AP/PA",
    "short_name": "appa"
  },
  {
    "id": 82,
    "name": "AXIOLATERAL",
    "short_name": "axlat"
  },
  {
    "id": 83,
    "name": "AP AXIAL",
    "short_name": "apax"
  },
  {
    "id": 84,
    "name": "AXIOLATERAL OBLIQUE",
    "short_name": "axlatob"
  },
  {
    "id": 85,
    "name": "STENVERS",
    "short_name": "sten"
  },
  {
    "id": 86,
    "name": "MODIFIED STENVERS",
    "short_name": "modsten"
  },
  {
    "id": 87,
    "name": "AP DECUBITUS",
    "short_name": "AP DECUBITUS"
  },
  {
    "id": 88,
    "name": "LATERAL XTABLE",
    "short_name": "LATERAL XTABLE"
  },
  {
    "id": 89,
    "name": "SPECIAL",
    "short_name": "SPECIAL"
  },
  {
    "id": 90,
    "name": "NOT AVAILABLE (NA)",
    "short_name": "NOT AVAILABLE (NA)"
  },
  {
    "id": 91,
    "name": "TANGENTIAL",
    "short_name": "TANGENTIAL"
  },
  {
    "id": 92,
    "name": "DORSOPLANTAR",
    "short_name": "DORSOPLANTAR"
  },
  {
    "id": 93,
    "name": "TOWNE",
    "short_name": "TOWNE"
  },
  {
    "id": 94,
    "name": "CALDWELL",
    "short_name": "CALDWELL"
  },
  {
    "id": 95,
    "name": "SCAPHOID",
    "short_name": "SCAPHOID"
  },
  {
    "id": 96,
    "name": "PA ULNAR DEVIATION",
    "short_name": "PA ULNAR DEVIATION"
  },
  {
    "id": 97,
    "name": "MULTI VIEW 1",
    "short_name": "MULTI VIEW 1"
  },
  {
    "id": 98,
    "name": "MULTI VIEW 2",
    "short_name": "MULTI VIEW 2"
  },
  {
    "id": 99,
    "name": "MULTI VIEW 3",
    "short_name": "MULTI VIEW 3"
  },
  {
    "id": 100,
    "name": "MULTI VIEW 4",
    "short_name": "MULTI VIEW 4"
  },
  {
    "id": 101,
    "name": "MULTI VIEW 5",
    "short_name": "MULTI VIEW 5"
  },
  {
    "id": 102,
    "name": "MULTI VIEW 6",
    "short_name": "MULTI VIEW 6"
  },
  {
    "id": 103,
    "name": "SKYLINE LAURIN",
    "short_name": "SKYLINE LAURIN"
  },
  {
    "id": 104,
    "name": "OM",
    "short_name": "OM"
  },
  {
    "id": 105,
    "name": "AXILLARY",
    "short_name": "AXILLARY"
  },
  {
    "id": 106,
    "name": "AP CEPHALIC",
    "short_name": "AP CEPHALIC"
  },
  {
    "id": 107,
    "name": "LATERAL OBLIQUE",
    "short_name": "LATERAL OBLIQUE"
  },
  {
    "id": 108,
    "name": "FLEXION",
    "short_name": "FLEXION"
  },
  {
    "id": 109,
    "name": "EXTENSION",
    "short_name": "EXTENSION"
  },
  {
    "id": 110,
    "name": "PANORAMIC",
    "short_name": "PANORAMIC"
  },
  {
    "id": 111,
    "name": "CEPHALOGRAPHIC",
    "short_name": "CEPHALOGRAPHIC"
  },
  {
    "id": 112,
    "name": "ODONTOID",
    "short_name": "ODONTOID"
  },
  {
    "id": 113,
    "name": "SWIMMER",
    "short_name": "SWIMMER"
  },
  {
    "id": 114,
    "name": "PA-Flip Horizontal",
    "short_name": "PA-Flip Horizontal"
  },
  {
    "id": 115,
    "name": "AP SUPINE (NEONATAL)",
    "short_name": "AP SUPINE (NEONATAL)"
  },
  {
    "id": 116,
    "name": "CROSS TABLE LATERAL",
    "short_name": "CROSS TABLE LATERAL"
  },
  {
    "id": 117,
    "name": "ZANCA",
    "short_name": "ZANCA"
  },
  {
    "id": 118,
    "name": "OPEN MOUTH",
    "short_name": "OPEN MOUTH"
  },
  {
    "id": 119,
    "name": "CLOSE MOUTH",
    "short_name": "CLOSE MOUTH"
  },
  {
    "id": 120,
    "name": "PA Flip Horizontal",
    "short_name": "PA Flip Horizontal"
  },
  {
    "id": 121,
    "name": "SCAPHOID ",
    "short_name": "SCAPHOID "
  },
  {
    "id": 122,
    "name": "EXTENSION ",
    "short_name": "EXTENSION "
  },
  {
    "id": 123,
    "name": "ECG",
    "short_name": "ECG"
  },
  {
    "id": 124,
    "name": "OPG",
    "short_name": "OPG"
  },
  {
    "id": 125,
    "name": "EEG",
    "short_name": "EEG"
  },
  {
    "id": 128,
    "name": "TUNNEL",
    "short_name": "TUNNEL"
  },
  {
    "id": 129,
    "name": "SUNRISE",
    "short_name": "SUNRISE"
  },
  {
    "id": 130,
    "name": "Both Saltzman View",
    "short_name": "Both Saltzman View"
  },
  {
    "id": 132,
    "name": "SALTZMAN",
    "short_name": "SALTZMAN"
  }
];
