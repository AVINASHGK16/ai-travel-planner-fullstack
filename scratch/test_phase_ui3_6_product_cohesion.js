import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('\n--- Running UI-3.6 Product Polish & UX Cohesion Regression Suite ---\n');

const dashboardPath = path.resolve('frontend/src/components/Dashboard.jsx');
const travelOptionsPath = path.resolve('frontend/src/components/TravelOptions.jsx');
const roadTripPath = path.resolve('frontend/src/components/RoadTripDetails.jsx');
const tripOverviewPath = path.resolve('frontend/src/components/planner/TripOverview.jsx');
const plannerPagePath = path.resolve('frontend/src/pages/PlannerPage.jsx');
const appShellPath = path.resolve('frontend/src/components/shell/AppShell.jsx');
const helpModalPath = path.resolve('frontend/src/components/shell/HelpModal.jsx');

// 1. Dashboard.jsx checks
console.log('1. Checking Dashboard.jsx...');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
assert(!dashboardContent.includes("failed to delete ${destination}"), 'Dashboard delete error must not reference undefined destination variable');
assert(dashboardContent.includes('tripToDelete'), 'Dashboard manages tripToDelete modal confirmation state');
assert(dashboardContent.includes('Delete Trip Itinerary'), 'Dashboard includes Delete Trip Itinerary modal title');
assert(dashboardContent.includes('role="button"'), 'Dashboard trip card must include role="button"');
assert(dashboardContent.includes('tabIndex={0}'), 'Dashboard trip card must include tabIndex={0} for keyboard accessibility');
assert(dashboardContent.includes('onKeyDown='), 'Dashboard trip card must include onKeyDown handler');
console.log('✓ Dashboard.jsx checks passed!');

// 2. TravelOptions.jsx checks
console.log('2. Checking TravelOptions.jsx...');
const travelOptionsContent = fs.readFileSync(travelOptionsPath, 'utf8');
assert(travelOptionsContent.includes('onSelectTrainOffer'), 'TravelOptions must accept onSelectTrainOffer prop');
assert(travelOptionsContent.includes('onSelectBusOffer'), 'TravelOptions must accept onSelectBusOffer prop');
assert(travelOptionsContent.includes('activeTrainId'), 'TravelOptions tracks active train ID');
assert(travelOptionsContent.includes('activeBusId'), 'TravelOptions tracks active bus ID');
assert(travelOptionsContent.includes('Select Train'), 'TravelOptions provides primary Select Train action');
assert(travelOptionsContent.includes('Select Bus'), 'TravelOptions provides primary Select Bus action');
assert(travelOptionsContent.includes('<span>Selected</span>'), 'TravelOptions indicates Selected state with checkmark');
console.log('✓ TravelOptions.jsx checks passed!');

// 3. RoadTripDetails.jsx checks
console.log('3. Checking RoadTripDetails.jsx...');
const roadTripContent = fs.readFileSync(roadTripPath, 'utf8');
assert(roadTripContent.includes('onSelectRoadRoute'), 'RoadTripDetails accepts onSelectRoadRoute prop');
assert(roadTripContent.includes('Select Route &amp; View Itinerary') || roadTripContent.includes('Select Route & View Itinerary'), 'RoadTripDetails provides prominent primary CTA to proceed with chosen route');
assert(roadTripContent.includes('role="button"'), 'RoadTripDetails route cards include role="button"');
assert(roadTripContent.includes('tabIndex={0}'), 'RoadTripDetails route cards include tabIndex={0}');
console.log('✓ RoadTripDetails.jsx checks passed!');

// 4. TripOverview.jsx checks
console.log('4. Checking TripOverview.jsx...');
const tripOverviewContent = fs.readFileSync(tripOverviewPath, 'utf8');
assert(tripOverviewContent.includes('isLoading={savingTrip}'), 'TripOverview Save button must use isLoading={savingTrip}');
assert(tripOverviewContent.includes('activityToDelete'), 'TripOverview tracks activityToDelete for deletion safety');
assert(tripOverviewContent.includes('Delete Activity'), 'TripOverview renders Delete Activity modal confirmation');
assert(tripOverviewContent.includes('Export PDF'), 'TripOverview provides sticky/bottom completion CTA to export PDF');
assert(tripOverviewContent.includes('Save to Dashboard'), 'TripOverview provides completion CTA to save plan');
console.log('✓ TripOverview.jsx checks passed!');

// 5. PlannerPage.jsx checks
console.log('5. Checking PlannerPage.jsx...');
const plannerPageContent = fs.readFileSync(plannerPagePath, 'utf8');
assert(plannerPageContent.includes('onSelectTrainOffer='), 'PlannerPage passes onSelectTrainOffer handler to TravelOptions');
assert(plannerPageContent.includes('onSelectBusOffer='), 'PlannerPage passes onSelectBusOffer handler to TravelOptions');
assert(plannerPageContent.includes('onSelectRoadRoute='), 'PlannerPage passes onSelectRoadRoute handler to RoadTripDetails');
console.log('✓ PlannerPage.jsx checks passed!');

// 6. AppShell.jsx & HelpModal.jsx checks
console.log('6. Checking AppShell.jsx & HelpModal.jsx...');
const appShellContent = fs.readFileSync(appShellPath, 'utf8');
const helpModalContent = fs.readFileSync(helpModalPath, 'utf8');
assert(appShellContent.includes("setHelpModalTab('privacy')"), 'AppShell allows opening Privacy Policy directly');
assert(appShellContent.includes("setHelpModalTab('terms')"), 'AppShell allows opening Terms of Service directly');
assert(helpModalContent.includes('initialTab'), 'HelpModal accepts initialTab prop');
assert(helpModalContent.includes('Help & FAQs'), 'HelpModal includes Help & FAQs tab');
assert(helpModalContent.includes('Privacy Policy'), 'HelpModal includes Privacy Policy tab');
assert(helpModalContent.includes('Terms of Service'), 'HelpModal includes Terms of Service tab');
console.log('✓ AppShell.jsx & HelpModal.jsx checks passed!');

console.log('\nAll UI-3.6 Product Polish & UX Cohesion tests passed successfully! 🎉\n');
