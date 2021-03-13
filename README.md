# photos-site
A lightweight photos website, written in Node. Check it out a preview at [photos.znepb.me](https://photos.znepb.me/), my personal photos that use a modified version of this software.

## Setup

### Prerequisites

Just node and npm (which comes with node afaik). nginx is reccomended for reverse proxy.

## Main Setup

```
npm install
npm run prod
```
Make sure to change `authToken.txt` to a (recomended 16 character) random string, and change `password.txt` to a valid SHA256 hash of a passowrd. Also, it is reccomended to change all occourences of `me` in `index-admin.html` and `index.html` to your name. Just graze over the doccuments, you'll find the locations. Also, add a license type thing to them as well, so people can't steal your photos without permission. As of now, there's not much configuration.

## What It Does
You'll log in with your passowrd, and you can upload, delete, and change photos, from any device. Photos will automaticly be resized to be a good size for a website.

## Known Bugs
For whatever reason, dates are always one day ahead of what you actually set them to. Set them to the day before to rememdy this. If I figure out what's causing this some time, I'll fix it.

## Issues
If you find any problems, please make an issue. If you find a critical security issue, please email me at (soon) [contact.znepb.me](https://contact.znepb.me)