const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const ejs = require("ejs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const mongouri = "mongodb://127.0.0.1:27017/upload-db";
const conn = mongoose.createConnection(mongouri);

let bucket;

conn.once("open", () => {
    bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: "uploads" });
    console.log("GridFSBucket initialized");
});

const storage = new GridFsStorage({
    url: mongouri,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString("hex") + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: "uploads",
                };
                resolve(fileInfo);
            });
        });
    },
});

const upload = multer({ storage });

app.get("/", (req, res) => {
    res.render("home");
});

app.post("/", upload.single("file"), (req, res) => {
    console.log("File uploaded successfully:", req.file);
    res.redirect("/");
});

app.get("/image/:filename", async (req, res) => {
    try {
        const file = await bucket.find({ filename: req.params.filename }).toArray();
        
        if (!file || file.length === 0) {
            return res.status(404).json({ err: "No file exists" });
        }

        // Check if the file is an image
        if (file[0].contentType === "image/jpeg" || file[0].contentType === "image/png") {
            const readStream = bucket.openDownloadStreamByName(req.params.filename);
            readStream.pipe(res);
        } else {
            res.status(404).json({ err: "File is not an image" });
        }
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ err: "An error occurred" });
    }
});

app.listen(2000, () => {
    console.log("Server started on port 2000");
});
