// The complete journey of blood through the heart (double circulation).
// Marker coordinates are in the RAW .obj coordinate space
//   x: [-0.71, 0.71]  y: [0.0, 1.89] (apex bottom, great vessels top)  z: [-0.39, 0.39]
// The viewer applies the same centering + scaling to the model and the markers,
// so these anchor the labels to anatomically-plausible spots on the mesh.

export type OxygenState = "deoxygenated" | "oxygenated" | "exchange";
export type StructureType = "vessel" | "chamber" | "valve" | "organ";

export interface FunctionFact {
  title: string;
  text: string;
}

export interface FlowStep {
  id: string;
  name: string;
  nickname: string;
  type: StructureType;
  oxygen: OxygenState;
  oxygenPct: number; // 0-100, blood O2 saturation at this point
  pressure: string; // typical mmHg
  wall: string; // wall thickness / structural note
  description: string;
  functions: FunctionFact[];
  next: string; // where blood goes next
  marker: [number, number, number];
}

// Ordered flow: one full loop of double circulation, starting where used
// blood returns to the heart and ending as fresh blood leaves for the body.
export const FLOW: FlowStep[] = [
  {
    id: "vena-cava",
    name: "Vena Cava",
    nickname: "The Return Gates",
    type: "vessel",
    oxygen: "deoxygenated",
    oxygenPct: 70,
    pressure: "0–8 mmHg",
    wall: "Thin, distensible vein",
    description:
      "Two great veins deliver oxygen-poor blood back to the heart. The superior vena cava drains the head, neck and arms; the inferior vena cava drains everything below the diaphragm. Both empty into the right atrium.",
    functions: [
      { title: "Collect Used Blood", text: "Gather deoxygenated blood from the entire body." },
      { title: "Low-Pressure Return", text: "Move blood back to the heart against very little pressure." },
      { title: "Feed the Right Atrium", text: "Deposit blood into the first chamber of the flow." },
    ],
    next: "Right Atrium",
    marker: [-0.34, 1.58, 0.12],
  },
  {
    id: "right-atrium",
    name: "Right Atrium",
    nickname: "The Collecting Chamber",
    type: "chamber",
    oxygen: "deoxygenated",
    oxygenPct: 70,
    pressure: "2–6 mmHg",
    wall: "Thin muscular wall",
    description:
      "The upper-right chamber receives deoxygenated blood from the vena cavae. When it contracts it tops off the right ventricle below it, pushing blood through the tricuspid valve.",
    functions: [
      { title: "Receive & Hold", text: "Buffer returning blood between heartbeats." },
      { title: "Prime the Ventricle", text: "Contract to fill the right ventricle completely." },
      { title: "Pacemaker Home", text: "Houses the SA node that sets the heart's rhythm." },
    ],
    next: "Tricuspid Valve",
    marker: [-0.4, 1.16, 0.16],
  },
  {
    id: "tricuspid-valve",
    name: "Tricuspid Valve",
    nickname: "The Three-Door Gate",
    type: "valve",
    oxygen: "deoxygenated",
    oxygenPct: 70,
    pressure: "One-way gate",
    wall: "Three fibrous cusps",
    description:
      "A one-way valve with three flaps (cusps) sitting between the right atrium and right ventricle. It opens to let blood fall through, then snaps shut so blood cannot leak backward when the ventricle squeezes.",
    functions: [
      { title: "Open Downward", text: "Let blood pass from atrium to ventricle." },
      { title: "Prevent Backflow", text: "Seal shut during ventricular contraction." },
      { title: "Anchored by Cords", text: "Chordae tendineae stop the cusps from flipping inside out." },
    ],
    next: "Right Ventricle",
    marker: [-0.24, 0.98, 0.22],
  },
  {
    id: "right-ventricle",
    name: "Right Ventricle",
    nickname: "The Lung Pump",
    type: "chamber",
    oxygen: "deoxygenated",
    oxygenPct: 70,
    pressure: "25/4 mmHg",
    wall: "Moderate muscular wall",
    description:
      "The lower-right chamber pumps deoxygenated blood the short distance to the lungs. Because that trip is close and low-resistance, its wall is thinner than the left ventricle's.",
    functions: [
      { title: "Pump to the Lungs", text: "Drive blood into the pulmonary artery." },
      { title: "Short-Haul Power", text: "Generate just enough pressure for the pulmonary circuit." },
      { title: "Match the Left", text: "Eject the same volume as the left ventricle each beat." },
    ],
    next: "Pulmonary Valve",
    marker: [-0.34, 0.58, 0.26],
  },
  {
    id: "pulmonary-valve",
    name: "Pulmonary Valve",
    nickname: "The Lung Gateway",
    type: "valve",
    oxygen: "deoxygenated",
    oxygenPct: 70,
    pressure: "One-way gate",
    wall: "Three semilunar cusps",
    description:
      "A half-moon (semilunar) valve guarding the exit from the right ventricle into the pulmonary artery. It opens as the ventricle contracts and closes to stop blood sliding back in.",
    functions: [
      { title: "Guard the Exit", text: "Open only when the right ventricle pushes." },
      { title: "Prevent Reflux", text: "Close instantly as the ventricle relaxes." },
      { title: "Semilunar Design", text: "Three pocket-like cusps balloon shut under back-pressure." },
    ],
    next: "Pulmonary Artery",
    marker: [-0.08, 1.36, 0.2],
  },
  {
    id: "pulmonary-artery",
    name: "Pulmonary Artery",
    nickname: "The Only Blue Artery",
    type: "vessel",
    oxygen: "deoxygenated",
    oxygenPct: 70,
    pressure: "25/8 mmHg",
    wall: "Elastic arterial wall",
    description:
      "The pulmonary trunk carries deoxygenated blood away from the heart, then splits into left and right branches to each lung. It is the only artery in the body that carries oxygen-poor blood.",
    functions: [
      { title: "Route to Both Lungs", text: "Branch left and right toward each lung." },
      { title: "Carry Blue Blood", text: "The lone artery moving deoxygenated blood." },
      { title: "Deliver for Exchange", text: "Bring blood to the alveolar capillaries." },
    ],
    next: "Lungs",
    marker: [0.04, 1.72, 0.14],
  },
  {
    id: "lungs",
    name: "Lungs",
    nickname: "The Refuelling Station",
    type: "organ",
    oxygen: "exchange",
    oxygenPct: 85,
    pressure: "Capillary bed",
    wall: "Alveolar membrane",
    description:
      "In the lungs' tiny air sacs, blood drops off carbon dioxide and picks up oxygen. This is the moment blood turns from blue to red — the hand-off between the pulmonary and systemic loops.",
    functions: [
      { title: "Release CO₂", text: "Offload waste carbon dioxide into exhaled air." },
      { title: "Load Oxygen", text: "Bind fresh oxygen to haemoglobin." },
      { title: "Blue → Red", text: "Convert deoxygenated blood into oxygenated blood." },
    ],
    next: "Pulmonary Veins",
    marker: [0.62, 1.5, 0.05],
  },
  {
    id: "pulmonary-veins",
    name: "Pulmonary Veins",
    nickname: "The Only Red Veins",
    type: "vessel",
    oxygen: "oxygenated",
    oxygenPct: 98,
    pressure: "6–12 mmHg",
    wall: "Thin venous wall",
    description:
      "Four pulmonary veins return freshly oxygenated blood from the lungs to the left atrium. They are the only veins in the body that carry oxygen-rich blood.",
    functions: [
      { title: "Return Fresh Blood", text: "Bring oxygenated blood back from the lungs." },
      { title: "Carry Red Blood", text: "The lone veins moving oxygenated blood." },
      { title: "Fill the Left Atrium", text: "Deliver blood into the systemic side of the heart." },
    ],
    next: "Left Atrium",
    marker: [0.42, 1.26, -0.12],
  },
  {
    id: "left-atrium",
    name: "Left Atrium",
    nickname: "The Fresh Reservoir",
    type: "chamber",
    oxygen: "oxygenated",
    oxygenPct: 98,
    pressure: "4–12 mmHg",
    wall: "Thin muscular wall",
    description:
      "The upper-left chamber receives oxygen-rich blood from the pulmonary veins and, on contraction, pushes it through the mitral valve to fill the powerful left ventricle.",
    functions: [
      { title: "Receive Oxygen-Rich Blood", text: "Collect fresh blood returning from the lungs." },
      { title: "Prime the Left Ventricle", text: "Top off the body's main pump." },
      { title: "Guard the Gateway", text: "Feed blood through the mitral valve." },
    ],
    next: "Mitral Valve",
    marker: [0.42, 1.16, -0.02],
  },
  {
    id: "mitral-valve",
    name: "Mitral Valve",
    nickname: "The Two-Door Gate",
    type: "valve",
    oxygen: "oxygenated",
    oxygenPct: 98,
    pressure: "One-way gate",
    wall: "Two fibrous cusps",
    description:
      "Also called the bicuspid valve, this two-flap valve sits between the left atrium and left ventricle. It opens to let fresh blood fall in and seals against the enormous pressure of the left ventricle.",
    functions: [
      { title: "Open Downward", text: "Let oxygenated blood into the left ventricle." },
      { title: "Withstand High Pressure", text: "Hold firm against the strongest chamber." },
      { title: "Two Cusps", text: "The only heart valve with just two leaflets." },
    ],
    next: "Left Ventricle",
    marker: [0.2, 0.92, 0.16],
  },
  {
    id: "left-ventricle",
    name: "Left Ventricle",
    nickname: "The Body Pump",
    type: "chamber",
    oxygen: "oxygenated",
    oxygenPct: 98,
    pressure: "120/8 mmHg",
    wall: "Thickest muscular wall",
    description:
      "The heart's powerhouse. This lower-left chamber has the thickest wall because it must push oxygenated blood through the entire body. It generates the highest pressure of any chamber.",
    functions: [
      { title: "Pump to the Whole Body", text: "Drive blood into the aorta and systemic circuit." },
      { title: "Highest Pressure", text: "Produce the force felt as your blood pressure." },
      { title: "Thickest Muscle", text: "Its wall is roughly three times the right ventricle's." },
    ],
    next: "Aortic Valve",
    marker: [0.34, 0.56, 0.22],
  },
  {
    id: "aortic-valve",
    name: "Aortic Valve",
    nickname: "The Body Gateway",
    type: "valve",
    oxygen: "oxygenated",
    oxygenPct: 98,
    pressure: "One-way gate",
    wall: "Three semilunar cusps",
    description:
      "A semilunar valve at the exit of the left ventricle into the aorta. It opens under the ventricle's huge push and closes to keep high-pressure blood from flooding back into the heart.",
    functions: [
      { title: "Guard the Main Exit", text: "Open as the left ventricle contracts." },
      { title: "Hold Back the Aorta", text: "Seal against the body's highest back-pressure." },
      { title: "Semilunar Cusps", text: "Three pockets snap shut to prevent reflux." },
    ],
    next: "Aorta",
    marker: [0.06, 1.2, 0.1],
  },
  {
    id: "aorta",
    name: "Aorta",
    nickname: "The Great Highway",
    type: "vessel",
    oxygen: "oxygenated",
    oxygenPct: 98,
    pressure: "120/80 mmHg",
    wall: "Thick elastic wall",
    description:
      "The largest artery in the body arches up and out of the left ventricle, then branches to carry oxygen-rich blood everywhere. From here the blood delivers oxygen, becomes deoxygenated, and the whole journey begins again.",
    functions: [
      { title: "Distribute Everywhere", text: "Branch to supply every organ and tissue." },
      { title: "Elastic Recoil", text: "Stretch and rebound to smooth out each pulse." },
      { title: "Close the Loop", text: "Blood returns via the vena cava to start over." },
    ],
    next: "Vena Cava (loop restarts)",
    marker: [0.16, 1.76, -0.04],
  },
];

export const OXYGEN_META: Record<
  OxygenState,
  { label: string; color: string; soft: string; ring: string }
> = {
  deoxygenated: { label: "Deoxygenated", color: "#3b82f6", soft: "#dbeafe", ring: "#93c5fd" },
  oxygenated: { label: "Oxygenated", color: "#e11d48", soft: "#ffe4e6", ring: "#fda4af" },
  exchange: { label: "Gas Exchange", color: "#8b5cf6", soft: "#ede9fe", ring: "#c4b5fd" },
};

export const TYPE_LABEL: Record<StructureType, string> = {
  vessel: "Blood Vessel",
  chamber: "Heart Chamber",
  valve: "Heart Valve",
  organ: "Gas Exchange",
};
