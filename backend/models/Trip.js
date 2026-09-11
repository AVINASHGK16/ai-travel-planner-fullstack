import mongoose from 'mongoose';

const TripSchema = new mongoose.Schema({
  userEmail: String,
  from: String,
  to: String,
  date: String,
  returnDate: String,
  travelers: Number,
  budget: Number,
  distance: Number,
  coordinates: {
    from: [Number],
    to: [Number],
    mid: [Number]
  },
  options: mongoose.Schema.Types.Mixed,
  suggestions: mongoose.Schema.Types.Mixed,
  itinerary: mongoose.Schema.Types.Mixed,
  budgetDetails: mongoose.Schema.Types.Mixed,
  roadTripDetails: mongoose.Schema.Types.Mixed,
  weather: mongoose.Schema.Types.Mixed,
  tripDays: Number,
  isAIGenerated: Boolean,
  generationSource: String,
  generationNotice: String
}, { timestamps: true });

export const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
export default Trip;
