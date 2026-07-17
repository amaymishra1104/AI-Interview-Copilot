// Featured companies shown as quick-pick tiles
export const FEATURED = [
  { id: "Agnostic",   name: "General",   tagline: "Role-focused prep",       color: "#94a3b8", initials: "★" },
  { id: "Google",     name: "Google",    tagline: "Scale & product sense",   color: "#4285F4", initials: "G"  },
  { id: "Amazon",     name: "Amazon",    tagline: "Leadership principles",   color: "#FF9900", initials: "A"  },
  { id: "Meta",       name: "Meta",      tagline: "Speed & ownership",       color: "#0081FB", initials: "M"  },
  { id: "Microsoft",  name: "Microsoft", tagline: "Growth mindset",          color: "#00A4EF", initials: "MS" },
  { id: "Netflix",    name: "Netflix",   tagline: "Culture & judgment",      color: "#E50914", initials: "N"  },
  { id: "Stripe",     name: "Stripe",    tagline: "Deep technical bar",      color: "#635BFF", initials: "S"  },
  { id: "Apple",      name: "Apple",     tagline: "Craft & clarity",         color: "#A2AAAD", initials: "A"  },
];

// All searchable companies (includes featured + extended list)
export const ALL_COMPANIES = [
  ...FEATURED,

  // US Big Tech & Unicorns
  { id: "Uber",         name: "Uber",         tagline: "Reliability at scale",       color: "#000000", initials: "U"  },
  { id: "Airbnb",       name: "Airbnb",       tagline: "Belonging & trust",          color: "#FF5A5F", initials: "Ab" },
  { id: "Twitter",      name: "Twitter / X",  tagline: "Real-time & scale",          color: "#1DA1F2", initials: "X"  },
  { id: "LinkedIn",     name: "LinkedIn",     tagline: "Professional graph",         color: "#0077B5", initials: "Li" },
  { id: "Salesforce",   name: "Salesforce",   tagline: "CRM at enterprise scale",    color: "#00A1E0", initials: "Sf" },
  { id: "Adobe",        name: "Adobe",        tagline: "Creative tools & APIs",      color: "#FF0000", initials: "Ad" },
  { id: "Oracle",       name: "Oracle",       tagline: "Databases & enterprise",     color: "#F80000", initials: "Or" },
  { id: "IBM",          name: "IBM",          tagline: "Enterprise AI & cloud",      color: "#054ADA", initials: "IB" },
  { id: "Intel",        name: "Intel",        tagline: "Hardware & compilers",       color: "#0071C5", initials: "In" },
  { id: "NVIDIA",       name: "NVIDIA",       tagline: "GPU & AI infrastructure",   color: "#76B900", initials: "Nv" },
  { id: "Snowflake",    name: "Snowflake",    tagline: "Cloud data warehouse",       color: "#29B5E8", initials: "Sf" },
  { id: "Databricks",   name: "Databricks",   tagline: "Data + AI platform",         color: "#FF3621", initials: "Db" },
  { id: "Palantir",     name: "Palantir",     tagline: "Data intelligence",          color: "#101113", initials: "Pa" },
  { id: "Atlassian",    name: "Atlassian",    tagline: "Dev tooling & collaboration",color: "#0052CC", initials: "At" },
  { id: "GitHub",       name: "GitHub",       tagline: "Developer platform",         color: "#333333", initials: "Gh" },
  { id: "Notion",       name: "Notion",       tagline: "All-in-one workspace",       color: "#000000", initials: "No" },
  { id: "Figma",        name: "Figma",        tagline: "Collaborative design",       color: "#F24E1E", initials: "Fi" },
  { id: "Zoom",         name: "Zoom",         tagline: "Video comms at scale",       color: "#2D8CFF", initials: "Zo" },
  { id: "Slack",        name: "Slack",        tagline: "Async communication",        color: "#4A154B", initials: "Sl" },
  { id: "HubSpot",      name: "HubSpot",      tagline: "Inbound growth platform",    color: "#FF7A59", initials: "Hs" },
  { id: "Twilio",       name: "Twilio",       tagline: "Communications APIs",        color: "#F22F46", initials: "Tw" },
  { id: "Shopify",      name: "Shopify",      tagline: "E-commerce infrastructure",  color: "#96BF48", initials: "Sh" },
  { id: "Cloudflare",   name: "Cloudflare",   tagline: "Network & edge security",    color: "#F48120", initials: "Cf" },
  { id: "MongoDB",      name: "MongoDB",      tagline: "Document databases",         color: "#47A248", initials: "Mg" },
  { id: "Datadog",      name: "Datadog",      tagline: "Observability platform",     color: "#632CA6", initials: "Dd" },
  { id: "Coinbase",     name: "Coinbase",     tagline: "Crypto infrastructure",      color: "#0052FF", initials: "Cb" },
  { id: "Robinhood",    name: "Robinhood",    tagline: "Fintech at scale",           color: "#00C805", initials: "Rb" },
  { id: "OpenAI",       name: "OpenAI",       tagline: "AGI research & products",    color: "#412991", initials: "Oa" },
  { id: "Anthropic",    name: "Anthropic",    tagline: "Safe AI systems",            color: "#d97757", initials: "An" },
  { id: "DeepMind",     name: "DeepMind",     tagline: "AI research frontier",       color: "#4285F4", initials: "Dm" },
  { id: "SpaceX",       name: "SpaceX",       tagline: "Aerospace engineering",      color: "#005288", initials: "Sx" },
  { id: "Tesla",        name: "Tesla",        tagline: "EV & autonomous systems",    color: "#CC0000", initials: "Te" },

  // Indian Tech Companies
  { id: "Flipkart",     name: "Flipkart",     tagline: "E-commerce at India scale",  color: "#F74D0A", initials: "Fl" },
  { id: "Zomato",       name: "Zomato",       tagline: "Hyperlocal delivery",        color: "#E23744", initials: "Zm" },
  { id: "Swiggy",       name: "Swiggy",       tagline: "On-demand delivery",         color: "#FC8019", initials: "Sw" },
  { id: "Paytm",        name: "Paytm",        tagline: "Payments & fintech",         color: "#002970", initials: "Pt" },
  { id: "CRED",         name: "CRED",         tagline: "Premium fintech UX",         color: "#1C1C1C", initials: "CR" },
  { id: "Razorpay",     name: "Razorpay",     tagline: "Payment infrastructure",     color: "#3395FF", initials: "Rp" },
  { id: "Meesho",       name: "Meesho",       tagline: "Social commerce",            color: "#9B2DF0", initials: "Me" },
  { id: "PhonePe",      name: "PhonePe",      tagline: "UPI payments platform",      color: "#5F259F", initials: "PP" },
  { id: "Ola",          name: "Ola",          tagline: "Ride-hailing & EVs",         color: "#FFD600", initials: "Ol" },
  { id: "Zepto",        name: "Zepto",        tagline: "10-minute grocery delivery", color: "#8B3DFF", initials: "Ze" },
  { id: "Groww",        name: "Groww",        tagline: "Retail investing",           color: "#5367FF", initials: "Gw" },
  { id: "Nykaa",        name: "Nykaa",        tagline: "Beauty & fashion e-com",     color: "#FC2779", initials: "Ny" },
  { id: "MakeMyTrip",   name: "MakeMyTrip",   tagline: "Travel tech platform",       color: "#D92228", initials: "MM" },
  { id: "InMobi",       name: "InMobi",       tagline: "Mobile advertising",         color: "#E94D35", initials: "Im" },
  { id: "Freshworks",   name: "Freshworks",   tagline: "SaaS for SMBs",             color: "#0BB86B", initials: "Fw" },
  { id: "Zoho",         name: "Zoho",         tagline: "Enterprise SaaS suite",      color: "#E42527", initials: "Zh" },
  { id: "ShareChat",    name: "ShareChat",    tagline: "Indian language social",     color: "#E74C3C", initials: "SC" },
  { id: "Juspay",       name: "Juspay",       tagline: "Payment orchestration",      color: "#1A73E8", initials: "Jp" },
  { id: "TCS",          name: "TCS",          tagline: "IT services & consulting",   color: "#0067B1", initials: "TC" },
  { id: "Infosys",      name: "Infosys",      tagline: "Digital services",           color: "#007CC3", initials: "If" },
  { id: "Wipro",        name: "Wipro",        tagline: "IT & business process",      color: "#341D72", initials: "Wi" },
  { id: "HCL",          name: "HCL Tech",     tagline: "IT services",                color: "#0076C0", initials: "HC" },

  // Finance / Quant
  { id: "JPMorgan",     name: "JPMorgan",     tagline: "Finance & tech at scale",    color: "#003087", initials: "JP" },
  { id: "Goldman",      name: "Goldman Sachs", tagline: "Quant & trading systems",   color: "#7399C6", initials: "GS" },
  { id: "Citadel",      name: "Citadel",      tagline: "HFT & quant finance",       color: "#003087", initials: "Ci" },
  { id: "JaneStreet",   name: "Jane Street",  tagline: "Functional & quant trading", color: "#1a1a2e", initials: "JS" },
  { id: "TwoSigma",     name: "Two Sigma",    tagline: "Data-driven trading",        color: "#0A1931", initials: "2S" },
  { id: "DEShaw",       name: "D.E. Shaw",    tagline: "Computational finance",      color: "#1C3553", initials: "DE" },
];

// Backward compat alias
export const COMPANIES = FEATURED;

export function getCompany(id) {
  return (
    ALL_COMPANIES.find(c => c.id === id) || {
      id,
      name: id,
      tagline: "Company-specific interview prep",
      color: "#6366f1",
      initials: (id || "?").charAt(0).toUpperCase(),
    }
  );
}

export function searchCompanies(query) {
  if (!query.trim()) return FEATURED;
  const q = query.toLowerCase();
  return ALL_COMPANIES.filter(
    c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  ).slice(0, 8);
}
