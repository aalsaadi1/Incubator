// Starter course content: "Run Your First Ad Campaign".
// Used by both the CLI seed (prisma/seed-praxo.ts) and the admin
// "Load starter course" endpoint (api/praxo/admin/seed).

export const adsCourse = {
  slug: 'run-your-first-ads',
  title: 'Run Your First Ad Campaign',
  description:
    'Go from zero to a live, tracked ad campaign — with a teacher watching your screen the whole way.',
  coverEmoji: '📣',

  survey: {
    intro:
      "Five quick questions so your teacher can build a plan around what you're actually promoting.",
    questions: [
      {
        id: 'product',
        question: 'What are you promoting? Describe your product, service, or page in a sentence.',
        type: 'text',
        required: true,
      },
      {
        id: 'platform',
        question: 'Where do your customers spend time?',
        type: 'single_choice',
        options: ['Instagram / Facebook', 'Google Search', 'TikTok', 'Not sure'],
        required: true,
      },
      {
        id: 'budget',
        question: 'Monthly ad budget?',
        type: 'single_choice',
        options: ['Under $100', '$100–$500', '$500–$2,000', 'Over $2,000'],
        required: true,
      },
      {
        id: 'has_account',
        question: 'Do you already have a business/ad account on that platform?',
        type: 'single_choice',
        options: ['Yes, set up', 'Started but incomplete', 'No'],
        required: true,
      },
      {
        id: 'has_pixel',
        question: 'Is a tracking pixel / conversion tag installed on your site?',
        type: 'single_choice',
        options: ['Yes', 'No', "I don't have a website"],
        required: true,
      },
      {
        id: 'experience',
        question: 'Have you run paid ads before?',
        type: 'single_choice',
        options: ['Never', 'A little, without results', 'Yes, on another platform'],
        required: true,
      },
    ],
  },

  planTemplate: {
    teacherPersona:
      'You are Praxo, a warm but no-nonsense ads coach. You teach by doing: short spoken guidance, then the learner acts in the real ad platform while you watch and point. You celebrate real outcomes, never busywork.',
    steps: [
      {
        id: 'account',
        title: 'Set up your ad account',
        goal: 'A working business ad account, payment method attached.',
        baseInstructions:
          'Create the business account on the chosen platform, verify the business details, and attach a payment method.',
        gate: 'Ad account dashboard visible on screen with no setup warnings.',
        skipIf: { has_account: ['Yes, set up'] },
      },
      {
        id: 'positioning',
        title: 'Define your audience and offer',
        goal: 'One written sentence: who the ad targets, what it offers, and why they should care now.',
        baseInstructions:
          'Work through the positioning worksheet with your teacher: target customer, their trigger moment, your offer, and the success metric for this first campaign.',
        gate: 'Positioning statement written and reviewed against the KB checklist with the teacher.',
      },
      {
        id: 'pixel',
        title: 'Install conversion tracking',
        goal: 'The platform can see what visitors do on your site.',
        baseInstructions: 'Install the tracking pixel/tag on your site and fire a test event.',
        gate: 'Events Manager (or tag dashboard) shows the test event received, verified on screen.',
        skipIf: { has_pixel: ['Yes', "I don't have a website"] },
      },
      {
        id: 'creatives',
        title: 'Create two ad creatives',
        goal: 'Two distinct creatives (image/video + copy) ready to test against each other.',
        baseInstructions:
          'Draft two creatives with different hooks. Review each against the creative checklist in the knowledge base with your teacher before uploading.',
        gate: 'Two creatives uploaded to the ads manager, visible on screen.',
      },
      {
        id: 'campaign',
        title: 'Build the campaign',
        goal: 'A draft campaign with the right objective, a starter budget, and your defined audience.',
        baseInstructions:
          'Create the campaign: choose the objective that matches your success metric, set a conservative daily budget from your monthly budget, configure the audience from your positioning statement, and attach both creatives.',
        gate: 'Draft campaign settings (objective, budget, audience, both creatives) verified on screen.',
      },
      {
        id: 'prelaunch',
        title: 'Pre-launch review',
        goal: 'Every item on the pre-launch checklist passes.',
        baseInstructions:
          'Walk the pre-launch checklist with your teacher: tracking, budget caps, audience size sanity check, creative review policy risks, landing page match.',
        gate: 'All checklist items confirmed with the teacher, none skipped.',
      },
      {
        id: 'launch',
        title: 'Launch',
        goal: 'Your campaign is live and spending.',
        baseInstructions: 'Publish the campaign and confirm it passes platform review.',
        gate: 'Campaign status shows Active/Live on screen (not In Review, not Draft).',
      },
      {
        id: 'checkin',
        title: '48-hour check-in',
        goal: 'Read your first real data and make one informed change.',
        baseInstructions:
          'Two days after launch, review results with your teacher: impressions, CTR, cost per result. Compare your two creatives and make exactly one optimization (pause the loser, adjust budget, or refine audience). Document why.',
        gate: 'Metrics reviewed on screen and one documented optimization made.',
      },
      {
        id: 'graduation',
        title: 'Graduation retro',
        goal: 'Judge the campaign against the success metric you set in step 2.',
        baseInstructions:
          'Compare actual results to your positioning-step success metric, write three lessons learned, and set the plan for week two.',
        gate: 'Retro completed with the teacher; campaign still live and monitored.',
      },
    ],
  },

  // Starter knowledge base — grow to 40-60 chunks before first cohort.
  kbChunks: [
    {
      title: 'Choosing a campaign objective',
      stepTags: ['campaign'],
      content:
        "Pick the objective that matches the action you actually want, not the cheapest one. If you want purchases, choose a sales/conversion objective even though traffic objectives look cheaper per click — platforms optimize delivery toward the objective you pick, so a traffic campaign finds clickers, not buyers. For a first campaign with a small budget and no purchase history, a conversion objective on a lightweight event (add-to-cart, lead form) often trains faster than purchase.",
    },
    {
      title: 'Setting a starter daily budget',
      stepTags: ['campaign', 'prelaunch'],
      content:
        'Divide your monthly budget by 30 and start with roughly two-thirds of that daily, leaving headroom for testing. Do not spread a small budget across many ad sets: one campaign, one ad set, two creatives is the right shape under $500/month. Expect the first 3-5 days to be a learning phase with unstable costs — do not react to day-one numbers.',
    },
    {
      title: 'Audience sizing for a first campaign',
      stepTags: ['campaign', 'positioning'],
      content:
        "Aim for an audience the platform estimates in the high hundreds of thousands to low millions. Hyper-narrow audiences (under ~100k) starve delivery on small budgets and cost more per result; fully broad targeting works but needs stronger creative. Build from your positioning statement: one or two interest clusters that describe your customer's trigger moment, plus sensible geography and age bounds. Skip lookalikes until you have at least a few hundred conversions.",
    },
    {
      title: 'The two-creative test',
      stepTags: ['creatives', 'checkin'],
      content:
        'Always launch with two creatives that differ in the hook — the first line or first two seconds — not in minor details. One should lead with the problem, the other with the outcome. Judge them at the 48-hour check-in on CTR and cost per result, not likes. Pause the loser, keep the winner running, and make your next creative a new challenger against it.',
    },
    {
      title: 'Creative checklist',
      stepTags: ['creatives', 'prelaunch'],
      content:
        "Before uploading, each creative must pass: (1) the hook is understandable in two seconds without sound, (2) it shows the product or outcome, not a logo, (3) the copy's first line restates the hook, (4) there is exactly one call to action, (5) the landing page it links to repeats the same promise. Mismatched ad-to-page promises are the most common silent killer of first campaigns.",
    },
    {
      title: 'Why the pixel matters',
      stepTags: ['pixel', 'account'],
      content:
        "The pixel (or conversion tag) is how the platform learns which clicks turn into results, and how you will know whether the campaign works. Without it you are buying traffic blind and the algorithm cannot optimize. Install it before building the campaign, fire a test event, and confirm the event arrives in the platform's events dashboard. If you have no website, use the platform's native lead forms instead and skip pixel setup.",
    },
    {
      title: 'Positioning statement format',
      stepTags: ['positioning'],
      content:
        'Fill in: "For [specific person] who [trigger moment], [product] is the [category] that [key benefit], unlike [what they do today]." Then define success for this first campaign as one number: e.g., a sale at under $30 cost, or a lead at under $8. Every later decision — objective, audience, creative hook — should trace back to this sentence and this number.',
    },
    {
      title: 'Pre-launch checklist',
      stepTags: ['prelaunch', 'launch'],
      content:
        'Confirm before publishing: pixel/tag firing on the landing page; daily budget matches the plan (no accidental lifetime budget); campaign spending limit set at the account level as a safety net; audience estimate is not "too narrow"; both creatives attached and previewed on mobile; landing page loads in under 3 seconds on a phone; payment method valid. Then publish and expect platform review to take from minutes up to 24 hours.',
    },
    {
      title: 'Reading first results without panicking',
      stepTags: ['checkin'],
      content:
        "Benchmarks for a sanity check at 48 hours: CTR around or above 1% means the creative earns attention; below 0.5% means the hook is weak. Cost per result will be inflated during learning — judge the trend, not the absolute number. Zero impressions usually means the campaign is stuck in review, the budget is too low for the audience, or a payment issue. Change exactly one thing per check-in; changing several resets learning and teaches you nothing.",
    },
    {
      title: 'Common first-campaign mistakes',
      stepTags: ['campaign', 'checkin', 'launch'],
      content:
        'The five that kill most first campaigns: (1) editing the campaign daily, which restarts the learning phase; (2) too many ad sets splitting a small budget; (3) traffic objective when the goal is sales; (4) turning it off after two quiet days — the learning phase needs 3-5 days or ~50 events; (5) creative promising something the landing page does not deliver, which produces clicks and no conversions.',
    },
  ],
}
