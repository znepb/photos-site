const express = require("express");
const fs = require("fs");
const app = express();
const path = require('path');
const crypto = require("crypto");
const cookieParser = require('cookie-parser')
const busboy = require('connect-busboy');
const sharp = require('sharp');
const bodyParser = require('body-parser')

// Setup Express
app.use(bodyParser.json()); 
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(busboy());

if(fs.readFileSync("password.txt",  "ascii").startsWith("---")) {
    console.error("Please enter a valid SHA256 password to password.txt");
    process.exit(1);
}

if(fs.readFileSync("authToken.txt", "ascii").startsWith("---")) {
    console.error("Please enter a unique string to authToken.txt that does not start with three dashes.");
    process.exit(1);
}

// Util Functions
function checkAuth(req, res, redirect, callback) {
    if(req.cookies.auth == fs.readFileSync(path.join(__dirname, "authToken.txt"), 'ascii')) {
        callback();
    } else {
        res.redirect(redirect);
    }
}

function checkLength(length) {
    if(length == 0) {
        return "0000";
    } if(length < 10) {
        return "000" + length;
    } else if(length < 100) {
        return "00" + length;
    } else if(length < 1000) {
        return "0" + length;
    } else {
        return length;
    }
}

function convert(data) {
    for(let i = 0; i < data.length; i++) {
        let curr = data[i];
        let prev = data[i - 1];
        if(prev != null && Number(curr.id) != Number(prev.id) + 1) {
            return checkLength(Number(prev.id) + 1);
        } // if the last one is real and this one is not one more than prev
    }
    
    return checkLength(data.length);
}

// Register Static Pages

app.get("/", (req, res) => {
    if(req.cookies.auth == fs.readFileSync(path.join(__dirname, "authToken.txt"), 'ascii')) {
        res.sendFile(path.join(__dirname, "views", "index-admin.html"))
    } else {
        res.sendFile(path.join(__dirname, "views", "index.html"))
    }
    
});

// Register File Pages

app.get("/photos/:name", (req, res) => {
    if(fs.existsSync(path.join(__dirname, "photos", req.params.name))) {
        res.sendFile(path.join(__dirname, "photos", req.params.name));
    } else {
        res.sendStatus(404);
    }
})

// Register Action Pages

app.post("/photo-auth", (req, res) => {
    if(crypto.createHash("sha256").update(req.body.password).digest("hex") == fs.readFileSync(path.join(__dirname, "password.txt"))) {
        res.cookie('auth', fs.readFileSync(path.join(__dirname, "authToken.txt"), 'ascii'), {maxAge: 7 * 24 * 60 * 60 * 1000});
    }
    res.redirect("/");
})

app.get("/photos/delete/:id", (req, res) => {
    checkAuth(req, res, "/photos", () => {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname, "photos", "photos.json")));

        for(let i = 0; i < data.length; i++) {
            if(data[i].id == req.params.id) {
                fs.unlinkSync(path.join(__dirname, "photos", data[i].id + data[i].fileType));
                fs.unlinkSync(path.join(__dirname, "photos", "preview-" + data[i].id + data[i].fileType));
                data.splice(i, 1);
                fs.writeFileSync(path.join(__dirname, "photos", "photos.json"), JSON.stringify(data, null, 4));
                break;
            }
        }

        res.redirect("/photos?success=" + encodeURIComponent("Photo deleted successfully!"));
    })
})

app.get("/photos/updateDate/:id", (req, res) => {
    checkAuth(req, res, "/photos", () => {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname, "photos", "photos.json")));
        for(let i = 0; i < data.length; i++) {
            if(data[i] && data[i].id == req.params.id) {
                let date = new Date(req.query.timestamp);
                data[i].timestamp = `${date.getMonth() + 1}/${date.getDate() + 1}/${date.getFullYear()}`;
                fs.writeFileSync(path.join(__dirname, "photos", "photos.json"), JSON.stringify(data, null, 4));
                break;
            }
        }

        res.redirect("/photos?success=" + encodeURIComponent("Date updated successfully!"));
    })
})

app.get("/photos/updateLocation/:id", (req, res) => {
    checkAuth(req, res, "/photos", () => {
        let data = JSON.parse(fs.readFileSync(path.join(__dirname, "photos", "photos.json")));
        console.log(req.query);
        for(let i = 0; i < data.length; i++) {
            if(data[i] && data[i].id == req.params.id) {
                data[i].location = `${req.query.city}, ${req.query.region}`;
                fs.writeFileSync(path.join(__dirname, "photos", "photos.json"), JSON.stringify(data, null, 4));
                break;
            }
        }

        res.redirect("/photos");
        res.redirect("/photos?success=" + encodeURIComponent("Location updated successfully!"));
    })
})

app.post("/photos/upload", (req, res) => {
    checkAuth(req, res, "/photos", () => {
        req.pipe(req.busboy);
        console.log("OK")

        let formData = new Map();
        req.busboy.on('field', function(fieldname, val) {
            formData.set(fieldname, val);
        });

        let data = JSON.parse(fs.readFileSync(path.join(__dirname, "photos", "photos.json")));
        let l = convert(data);

        var re = /(?:\.([^.]+))?$/;

        let fname;

        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);
            fname = filename;
            
            const fstream = fs.createWriteStream(path.join(__dirname, "photos", l + re.exec(filename)[0]));
            
            file.pipe(fstream);
            fstream.on('close', function () {    
                sharp(path.join(__dirname, "photos", l + re.exec(filename)[0]))
                    .resize(350)
                    .toFile(path.join(__dirname, "photos", "preview-" + l + re.exec(filename)[0]));
            });
        });

        
        req.busboy.on("finish", function() {
            let interval = setInterval(() => {
                if(fname) {
                    let date = new Date(formData.get("date"));
                    data.splice(l, 0, {
                        id: l,
                        timestamp: `${date.getMonth() + 1}/${date.getDate() + 1}/${date.getFullYear()}`,
                        location: `${formData.get("city")}, ${formData.get("region")}`,
                        fileType: re.exec(fname)[0]
                    })
                    fs.writeFileSync(path.join(__dirname, "photos", "photos.json"), JSON.stringify(data, null, 4));
                    clearInterval(interval);
                }
            }, 250)
        });

        res.redirect("/photos?success=" + encodeURIComponent("Upload Success!"));
    })
})

// Listen

app.listen(3031);