const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j10pchd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("marn-friend");
    const friendRequestsCollection = database.collection("friend_requests");
    const usersCollection = database.collection("users");
    const friendListCollection = database.collection("friend-list");

    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
      }
    });

    app.post("/friend-requests", async (req, res) => {
      const {
        senderName,
        recipientId,
        senderEmail,
        senderImage,
        recipientEmail,
        recipientName,
        recipientImage,
      } = req.body;
      try {
        const newFriendRequest = {
          senderName,
          recipientId,
          senderEmail,
          recipientEmail,
          senderImage,
          recipientName,
          recipientImage,
          status: "pending",
          createdAt: new Date(),
        };
        const result = await friendRequestsCollection.insertOne(
          newFriendRequest
        );
        res.status(201).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error creating friend request", error });
      }
    });

    // app.get("/friend-requests/:email", async (req, res) => {
    //   try {
    //     const requests = await friendRequestsCollection.find().toArray();
    //     res.status(200).json(requests);
    //   } catch (error) {
    //     res.status(500).json({ message: "Error fetching friend requests", error });
    //   }
    // });

    app.get("/friend-requests/:email", async (req, res) => {
      try {
        const { email } = req.params; // Extract email from the route parameter
        console.log(email);
        console.log(req.body);

        // Find friend requests where either the sender or recipient email matches the provided email
        const requests = await friendRequestsCollection
          .find({
            $or: [{ recipientEmail: email }],
          })
          .toArray();

        res.status(200).json(requests);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error fetching friend requests", error });
      }
    });

    app.post("/friend-requests/accept", async (req, res) => {
      const { requestId, userEmail, userName, userPhoto } = req.body;
      console.log(requestId, userEmail, userName, userPhoto);
      try {
        // Find the friend request by ID
        const friendRequest = await friendRequestsCollection.findOne({
          _id: new ObjectId(requestId),
        });

        if (!friendRequest) {
          return res.status(404).json({ message: "Friend request not found" });
        }

        // Insert the accepted friend's data into the users collection
        const newUser = {
          name: friendRequest.senderName,
          email: friendRequest.senderEmail,
          image: friendRequest.senderImage,
          mailUser: friendRequest.recipientEmail,
          nameUser: friendRequest.recipientName,
          photoUser: friendRequest.recipientImage,
          createdAt: new Date(),
        };
        await friendListCollection.insertOne(newUser);

        // Update the friend request status to 'accepted'
        const result = await friendRequestsCollection.updateOne(
          { _id: new ObjectId(requestId) },
          { $set: { status: "accepted" } }
        );

        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error accepting friend request", error });
      }
    });

    app.post("/friend-requests/reject", async (req, res) => {
      const { requestId } = req.body;
      try {
        const result = await friendRequestsCollection.updateOne(
          { _id: new ObjectId(requestId) },
          { $set: { status: "rejected" } }
        );
        res.status(200).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error rejecting friend request", error });
      }
    });

    app.get("/friend-list", async (req, res) => {
      try {
        const requests = await friendListCollection.find().toArray();
        res.status(200).json(requests);
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error fetching friend requests", error });
      }
    });


    app.delete("/unfriend/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await friendListCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Friend not found" });
        }
        res.status(200).json({ message: "Friend removed successfully" });
      } catch (error) {
        res.status(500).json({ message: "Error removing friend", error });
      }
    });
    

  } finally {
    // Ensure the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


