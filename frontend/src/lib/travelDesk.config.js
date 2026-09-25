export const TRAVEL_MODES = [
  { id: 'Flight', label: 'Flight', iconName: 'Plane', description: 'Domestic or international air travel' },
  { id: 'Cab', label: 'Cab', iconName: 'Car', description: 'Local, airport or inter-city travel' },
  { id: 'Bus', label: 'Bus', iconName: 'Bus', description: 'Inter-city bus reservation' },
  { id: 'Train', label: 'Train', iconName: 'Train', description: 'Rail travel reservation' },
  { id: 'Hotel', label: 'Hotel Room', iconName: 'Building2', description: 'Room accommodation' }
];

export const TRAVEL_DESK_FIELDS = {
  Flight: [
    { name: 'Traveller', label: 'Traveller', type: 'input', required: true, full: false, placeholder: '', default: '' },
    { name: 'Purpose of visit', label: 'Purpose of visit', type: 'textarea', required: true, full: true, placeholder: 'Business reason, customer/project reference and expected outcome', default: '' },
    {
      name: 'Trip type',
      label: 'Trip type',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'Return',
      options: [
        { value: 'Return', label: 'Return' },
        { value: 'One-way', label: 'One-way' },
        { value: 'Multi-city / Onward', label: 'Multi-city / Onward' }
      ]
    },
    {
      name: 'Travel class',
      label: 'Travel class',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'Economy',
      options: [
        { value: 'Economy', label: 'Economy' },
        { value: 'Premium Economy', label: 'Premium Economy' },
        { value: 'Business', label: 'Business' }
      ]
    },
    { name: 'Date of travel', label: 'Date of travel', type: 'date', required: true, full: false, placeholder: '', default: '' },
    {
      name: 'Preferred departure time',
      label: 'Preferred time slot',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: '',
      options: [
        { value: '', label: 'Select time' },
        { value: 'Early morning (05:00–08:00)', label: 'Early morning (05:00–08:00)' },
        { value: 'Morning (08:00–12:00)', label: 'Morning (08:00–12:00)' },
        { value: 'Afternoon (12:00–17:00)', label: 'Afternoon (12:00–17:00)' },
        { value: 'Evening (17:00–21:00)', label: 'Evening (17:00–21:00)' },
        { value: 'Night (after 21:00)', label: 'Night (after 21:00)' },
        { value: 'Flexible', label: 'Flexible' }
      ]
    },
    { name: 'From', label: 'From', type: 'input', required: true, full: false, placeholder: 'City or airport', default: '' },
    { name: 'To', label: 'To', type: 'input', required: true, full: false, placeholder: 'City or airport', default: '' },
    { name: 'Return / onward date', label: 'Return / onward date', type: 'date', required: false, full: false, placeholder: '', default: '', group: 'Return / Onward Flight' },
    {
      name: 'Return / onward time',
      label: 'Preferred time slot',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: '',
      options: [
        { value: '', label: 'Select time' },
        { value: 'Early morning (05:00–08:00)', label: 'Early morning (05:00–08:00)' },
        { value: 'Morning (08:00–12:00)', label: 'Morning (08:00–12:00)' },
        { value: 'Afternoon (12:00–17:00)', label: 'Afternoon (12:00–17:00)' },
        { value: 'Evening (17:00–21:00)', label: 'Evening (17:00–21:00)' },
        { value: 'Night (after 21:00)', label: 'Night (after 21:00)' },
        { value: 'Flexible', label: 'Flexible' }
      ],
      group: 'Return / Onward Flight'
    },
    { name: 'Airline preference', label: 'Airline preference', type: 'input', required: false, full: false, placeholder: 'Optional', default: '', group: 'Return / Onward Flight' }
  ],
  Cab: [
    { name: 'Traveller', label: 'Traveller', type: 'input', required: true, full: false, placeholder: '', default: '' },
    { name: 'Purpose of visit', label: 'Purpose of visit', type: 'textarea', required: true, full: true, placeholder: 'Business reason, customer/project reference and expected outcome', default: '' },
    { name: 'Date of travel', label: 'Date of travel', type: 'date', required: true, full: false, placeholder: '', default: '' },
    {
      name: 'Journey type',
      label: 'Journey type',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'Local',
      options: [
        { value: 'Local', label: 'Local' },
        { value: 'Inter-city', label: 'Inter-city' },
        { value: 'Airport Pickup', label: 'Airport Pickup' },
        { value: 'Airport Drop', label: 'Airport Drop' }
      ]
    },
    {
      name: 'Number of passengers',
      label: 'Number of passengers',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: '1',
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' }
      ]
    },
    {
      name: 'Cab type',
      label: 'Cab type',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'Hatchback (WagonR, Swift etc.)',
      options: [
        { value: 'Hatchback (WagonR, Swift etc.)', label: 'Hatchback (WagonR, Swift etc.)' },
        { value: 'Sedan (Dzire, Aura, etc.)', label: 'Sedan (Dzire, Aura, etc.)' },
        { value: 'SUV (Ertiga, etc.)', label: 'SUV (Ertiga, etc.)' },
        { value: 'Premium (Innova, etc.)', label: 'Premium (Innova, etc.)' }
      ]
    },
    { name: 'Pickup location', label: 'Pickup location', type: 'input', required: true, full: false, placeholder: 'Full address or airport terminal', default: '' },
    { name: 'Pickup time', label: 'Pickup time', type: 'time', required: true, full: false, placeholder: '', default: '' },
    { name: 'Final drop location', label: 'Final drop location', type: 'input', required: true, full: false, placeholder: 'Full address', default: '' },
    { name: 'Estimated drop time', label: 'Estimated drop time', type: 'time', required: false, full: false, placeholder: '', default: '' },
    {
      name: 'Multi-pickup',
      label: 'Multi-pickup?',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'No',
      options: [
        { value: 'No', label: 'No' },
        { value: 'Yes', label: 'Yes' }
      ]
    },
    { name: 'Additional pickup locations', label: 'Additional pickup locations', type: 'textarea', required: true, full: true, placeholder: 'List locations in pickup sequence', default: '', conditional: 'Multi-pickup' },
    {
      name: 'Return cab',
      label: 'Return cab required?',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'No',
      options: [
        { value: 'No', label: 'No' },
        { value: 'Yes', label: 'Yes' }
      ]
    },
    { name: 'Special instructions', label: 'Special instructions', type: 'textarea', required: false, full: true, placeholder: 'Flight number, waiting requirement, luggage, accessibility or other instructions', default: '' }
  ],
  Bus: [
    { name: 'Traveller', label: 'Traveller', type: 'input', required: true, full: false, placeholder: '', default: '' },
    { name: 'Purpose of visit', label: 'Purpose of visit', type: 'textarea', required: true, full: true, placeholder: 'Business reason, customer/project reference and expected outcome', default: '' },
    { name: 'Date of travel', label: 'Date of travel', type: 'date', required: true, full: false, placeholder: '', default: '' },
    {
      name: 'Preferred departure time',
      label: 'Preferred departure time',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'Morning',
      options: [
        { value: 'Morning', label: 'Morning' },
        { value: 'Afternoon', label: 'Afternoon' },
        { value: 'Evening', label: 'Evening' },
        { value: 'Night', label: 'Night' },
        { value: 'Flexible', label: 'Flexible' }
      ]
    },
    { name: 'From', label: 'From', type: 'input', required: true, full: false, placeholder: 'City / boarding point', default: '' },
    { name: 'To', label: 'To', type: 'input', required: true, full: false, placeholder: 'City / dropping point', default: '' },
    {
      name: 'Bus type',
      label: 'Bus type',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'AC Sleeper',
      options: [
        { value: 'AC Sleeper', label: 'AC Sleeper' },
        { value: 'AC Seater', label: 'AC Seater' },
        { value: 'No preference', label: 'No preference' }
      ]
    },
    {
      name: 'Return required',
      label: 'Return journey required?',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'No',
      options: [
        { value: 'No', label: 'No' },
        { value: 'Yes', label: 'Yes' }
      ]
    },
    { name: 'Return date', label: 'Return date', type: 'date', required: true, full: false, placeholder: '', default: '', conditional: 'Return required' },
    {
      name: 'Return preferred time slot',
      label: 'Preferred return time slot',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'Morning',
      options: [
        { value: 'Morning', label: 'Morning' },
        { value: 'Afternoon', label: 'Afternoon' },
        { value: 'Evening', label: 'Evening' },
        { value: 'Night', label: 'Night' },
        { value: 'Flexible', label: 'Flexible' }
      ],
      conditional: 'Return required'
    }
  ],
  Train: [
    { name: 'Traveller', label: 'Traveller', type: 'input', required: true, full: false, placeholder: '', default: '' },
    { name: 'Purpose of visit', label: 'Purpose of visit', type: 'textarea', required: true, full: true, placeholder: 'Business reason, customer/project reference and expected outcome', default: '' },
    { name: 'Date of journey', label: 'Date of journey', type: 'date', required: true, full: false, placeholder: '', default: '' },
    {
      name: 'Preferred time',
      label: 'Preferred time slot',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'Morning',
      options: [
        { value: 'Morning', label: 'Morning' },
        { value: 'Afternoon', label: 'Afternoon' },
        { value: 'Evening', label: 'Evening' },
        { value: 'Night', label: 'Night' },
        { value: 'Flexible', label: 'Flexible' }
      ]
    },
    { name: 'From station', label: 'From station', type: 'input', required: true, full: false, placeholder: '', default: '' },
    { name: 'To station', label: 'To station', type: 'input', required: true, full: false, placeholder: '', default: '' },
    {
      name: 'Travel class',
      label: 'Travel class',
      type: 'select',
      required: true,
      full: false,
      placeholder: '',
      default: 'AC Chair Car',
      options: [
        { value: 'AC Chair Car', label: 'AC Chair Car' },
        { value: '3A', label: '3A' },
        { value: '2A', label: '2A' },
        { value: '1A', label: '1A' },
        { value: 'Executive Chair Car', label: 'Executive Chair Car' }
      ]
    },
    {
      name: 'Berth preference',
      label: 'Berth preference',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'No preference',
      options: [
        { value: 'No preference', label: 'No preference' },
        { value: 'Lower', label: 'Lower' },
        { value: 'Middle', label: 'Middle' },
        { value: 'Upper', label: 'Upper' },
        { value: 'Side Lower', label: 'Side Lower' }
      ]
    },
    {
      name: 'Return required',
      label: 'Return journey required?',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'No',
      options: [
        { value: 'No', label: 'No' },
        { value: 'Yes', label: 'Yes' }
      ]
    },
    { name: 'Return date', label: 'Return date', type: 'date', required: true, full: false, placeholder: '', default: '', conditional: 'Return required' },
    {
      name: 'Return preferred time slot',
      label: 'Preferred return time slot',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'Morning',
      options: [
        { value: 'Morning', label: 'Morning' },
        { value: 'Afternoon', label: 'Afternoon' },
        { value: 'Evening', label: 'Evening' },
        { value: 'Night', label: 'Night' },
        { value: 'Flexible', label: 'Flexible' }
      ],
      conditional: 'Return required'
    },
    { name: 'Train preference', label: 'Train preference', type: 'input', required: false, full: true, placeholder: 'Train number/name, if preferred', default: '' }
  ],
  Hotel: [
    { name: 'Traveller', label: 'Traveller', type: 'input', required: true, full: false, placeholder: '', default: '' },
    { name: 'Purpose of visit', label: 'Purpose of visit', type: 'textarea', required: true, full: true, placeholder: 'Business reason, customer/project reference and expected outcome', default: '' },
    { name: 'City / Location', label: 'City / Location', type: 'input', required: true, full: false, placeholder: 'City and preferred area', default: '' },
    { name: 'Number of rooms', label: 'Number of rooms', type: 'number', required: true, full: false, placeholder: '', default: '1', min: '1' },
    { name: 'Check-in date', label: 'Check-in date', type: 'date', required: true, full: false, placeholder: '', default: '' },
    { name: 'Check-in time', label: 'Check-in time', type: 'time', required: false, full: false, placeholder: '', default: '' },
    { name: 'Check-out date', label: 'Check-out date', type: 'date', required: true, full: false, placeholder: '', default: '' },
    { name: 'Check-out time', label: 'Check-out time', type: 'time', required: false, full: false, placeholder: '', default: '' },
    {
      name: 'Room type',
      label: 'Room type',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'Single occupancy',
      options: [
        { value: 'Single occupancy', label: 'Single occupancy' },
        { value: 'Twin sharing', label: 'Twin sharing' }
      ]
    },
    {
      name: 'Other traveller name',
      label: 'Other traveller name (Sharing with)',
      type: 'input',
      required: true,
      full: false,
      placeholder: 'Full name of colleague sharing room',
      default: '',
      conditional: 'Room type',
      conditionalValue: 'Twin sharing'
    },
    {
      name: 'Meal plan',
      label: 'Meal preference',
      type: 'select',
      required: false,
      full: false,
      placeholder: '',
      default: 'Breakfast included',
      options: [
        { value: 'Breakfast included', label: 'Breakfast included' },
        { value: 'Room only', label: 'Room only' }
      ]
    },
    { name: 'Preferred hotel / locality', label: 'Preferred hotel / locality', type: 'input', required: false, full: true, placeholder: 'Hotel name, customer office proximity or locality', default: '' },
    { name: 'Special requirements', label: 'Special requirements', type: 'textarea', required: false, full: true, placeholder: 'Early check-in, late check-out, accessibility, non-smoking room or other needs', default: '' }
  ]
};
