import cron from 'node-cron';
import Listing from '../models/Listing.js';
import Claim from '../models/Claim.js';
import User from '../models/User.js';
import { notifyUser } from '../utils/notifications.js';

const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Grace period = 10 minutes
      const graceTime = new Date(now.getTime() - 10 * 60 * 1000);

      // 1. Mark expired listings
      const listingsToExpire = await Listing.find({ expiryTime: { $lt: now }, isExpired: false });
      const expiredListings = await Listing.updateMany(
        { _id: { $in: listingsToExpire.map(item => item._id) } },
        { $set: { isExpired: true } }
      );
      if (expiredListings.modifiedCount > 0) {
        console.log(`Marked ${expiredListings.modifiedCount} listings as expired.`);
        listingsToExpire.forEach((listing) => {
          notifyUser({
            recipient: listing.donor,
            type: 'LISTING_EXPIRED',
            title: 'Listing expired',
            message: `${listing.foodType} listing has expired.`,
            data: { listingId: listing._id }
          }).catch(err => console.error('Expiry notification failed:', err.message));
        });
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
          const user = await User.findByIdAndUpdate(claim.ngoId, { $inc: { strikes: 1 } }, { new: true });
          if (user) {
            await notifyUser({
              recipient: user._id,
              type: 'STRIKE_ALERT',
              title: 'No-show strike added',
              message: `A no-show strike was added. Current strikes: ${user.strikes}.`,
              data: { claimId: claim._id, strikes: user.strikes, fcmToken: user.fcmToken }
            });
          }
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
