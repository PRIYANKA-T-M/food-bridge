import cron from 'node-cron';
import Listing from '../models/Listing.js';
import Claim from '../models/Claim.js';
import User from '../models/User.js';

const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Grace period = 10 minutes
      const graceTime = new Date(now.getTime() - 10 * 60 * 1000);

      // 1. Mark expired listings
      const expiredListings = await Listing.updateMany(
        { expiryTime: { $lt: now }, isExpired: false },
        { $set: { isExpired: true } }
      );
      if (expiredListings.modifiedCount > 0) {
        console.log(`Marked ${expiredListings.modifiedCount} listings as expired.`);
      }

      // 2. Identify claims that are 'pending' but listing expiry + grace period has passed
      // This means the NGO did not show up
      const noShowClaims = await Claim.find({
        status: 'pending'
      }).populate('listingId');

      for (let claim of noShowClaims) {
        if (claim.listingId && claim.listingId.expiryTime < graceTime) {
          // Mark claim as no-show
          claim.status = 'no-show';
          await claim.save();

          // Add a strike to the NGO
          await User.findByIdAndUpdate(claim.ngoId, { $inc: { strikes: 1 } });
          console.log(`Marked claim ${claim._id} as no-show and appended strike to NGO ${claim.ngoId}`);
        }
      }

    } catch (error) {
      console.error('Cron job error:', error.message);
    }
  });

  console.log('Cron tasks initialized.');
};

export default startCronJobs;
