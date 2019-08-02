const Jimp = require('jimp');
const {Attachment} = require('discord.js')
const {stripIndents} = require('common-tags')

exports.run = async(client,msg,args,flags,logger) => {
    if(args.length == 0 || args[0].toLowerCase() === "help") {
        return msg.channel.send(stripIndents
            `**__Available Commands__** (**[] Optional** | **<> Required**)
            \`fbi\` - generate fbi meme with google search
            \`template <template name>\` - run template
            **Available Templates:**
            ${templates.map(v => v.names[0]).join("\n")}` 
        )   
    }
    const m = await msg.channel.send(`**⏳ Processing your request...**`);
    switch(args[0].toLowerCase()) {
        case "fbi": {
            const query = args.slice(1).join(" ")
            Jimp.read(`./db/memes/fbi_google.png`).then(image => {
                Jimp.loadFont(Jimp.FONT_SANS_32_BLACK).then(font => {
                    image.print(font,30,212,query); //30,210    442/46
                    sendImage(image,m);
                })
            }).catch(err => {
                logger.warn('[meme/fbi] ',err.message)
                msg.channel.send(`❌ There was an error while processing`);
            })
            break;
        }
        case "template":
        case "tp": {
            let imageEdits = templates.find(v => v.names.find(a => a === args[1].toLowerCase()));
            if(!imageEdits) return m.edit(`Couldn't find any templates, try \`\`meme help\`\``);
            
            return Jimp.read(`./db/memes/${imageEdits.img_name}`).then(template => {
                getImage(msg,args[args.length-1]).then(image => {
                    if(!image) return m.edit("**Please upload an image or attach an url to an image.**")
                    for(let i=0;i<imageEdits.effects.length;i++) {
                        const element = imageEdits.effects[i];
                        if(element.rotate && element.rotate !== 0) image.rotate(element.rotate);
                        (element.inverse_stretch) ? template.resize(element.stretch[0],element.stretch[1]) : image.resize(element.stretch[0],element.stretch[1]);
                        (element.inverse) ? image.composite(template,element.coords[0],element.coords[1]) : template.composite(image,element.coords[0],element.coords[1]);
                    }
                    return sendImage(template,m);
                }).catch(err => {
                    return m.edit(`Failed to acquire image. ${err.message}`);
                })
            
            }).catch(err => {
                logger.error(`[meme/templateError] ${err.message}`)
                return m.edit(`❌ Template has experienced an error.`);
            }) 
        }
        default: 
            m.edit("Unknown option, use `meme help` for a list of options")
    }
};

exports.config = {
	usageIfNotSet: false
};

exports.help = {
	name: ['meme','memes'],
	description: 'Meme Generation',
	usage:'meme help'
};

function sendImage(image,m) {
    image.getBufferAsync(Jimp.MIME_PNG).then(result => {
        const sending = new Attachment(result,`zeko-${image.hash()}.png`);
        m.channel.send(sending)
        m.delete();
    }).catch(err => {
        logger.error("sendImage:",err.message)
        return m.edit(`❌ Failed to upload attachment. `,err.message.slice(0,100)).catch(() => {})
    })
}
const valid_image_url_regex = new RegExp(/(https?:\/\/.+\.(?:png|jpg))/,'i')
function getImage(msg,text,getLast) {
    return new Promise((resolve,reject) => {
        if(getLast) {
            if(msg.channel.lastMessage) {
                if(msg.channel.lastMessage.attachments.size > 0) {
                    const attachment = msg.channel.lastMessage.attachment.first();
                    if(attachment.height) {
                        if(!valid_image_url_regex.test(attachment.url)) return reject(new Error("Attachment is an invalid image, this should not happen."))
                        return Jimp.read({url:attachment.url})
                        .then(image => resolve(image)).catch(err => {
                            logger.error("getImage:",err.toString())
                            reject(err);
                        })
                    }
                }
            }
            msg.channel.fetchMessages({
                before:msg.id,
                limit:10
            }).then(messages => {
                const images = messages.filter(m => {
                    return m.attachments.size > 0 && m.attachments.first().height
                });
                if(images.size > 0) {
                    const attachment = images.first().attachments.first();
                    if(!valid_image_url_regex.test(attachment.url)) return reject(new Error("Attachment is an invalid image, this should not happen."))
                    Jimp.read({url:attachment.url})
                    .then(image => resolve(image)).catch(err => {
                        logger.error("getImage:",err.toString())
                        reject(err);
                    })
                }else{
                    return resolve(null);
                }

                
            }).catch(err => reject(err));
        }else{
            if(msg.attachments.size === 0 && !text) return resolve(null)
            if(msg.attachments.size > 0 && !msg.attachments.first().height) return resolve(null)
            let attachment_url;
            if(msg.attachments.size > 0) {
                attachment_url = msg.attachments.first().url;
            }else{
                if(!valid_image_url_regex.test(text)) return reject(new Error("Missing or invalid attachment url. URL Needs to be http(s) protocol, and png/jpg file"))
                attachment_url = text;
            }
            Jimp.read({url:attachment_url})
            .then(image => {
                resolve(image)
            }).catch(err => {
                logger.error("getImage:",err.toString())
                reject(err);
            })
        }
        
    })
}
 

const templates = [
    {
        names:["jackoff","fap"],
        img_name:"jackoff.png",
        effects:[
            {
                rotate:0,
                stretch:[410,330],
                coords:[33,142],
            }
        ]
    },
    {
        names:["gunshot"],
        img_name:"gunshot.png",
        effects:[
            {
                rotate:0,
                stretch:[312,290],
                coords:[0,333],
            }
        ]
    },
    {
        names:["beautiful","beauty"],
        img_name:"beautiful.jpg",
        effects:[
            {
                rotate:0,
                stretch:[88,99],
                coords:[256,27],
            },
            {
                rotate:0,
                stretch:[89,103],
                coords:[256,227],
            }
        ]
    },
    {
        names:["eclipse","trump"],
        img_name:"eclipse.jpg",
        effects:[
            {
                rotate:0,
                stretch:[345,309],
                coords:[0,281],
            }
        ]
    },
    {
        names:["fbi"],
        img_name:"fbi.png",
        effects:[
            {
                rotate:0,
                inverse:false, //Inverse -> put template on top of image
                inverse_stretch:false,  //Inverse-Stretch -> Stretch the template, instead of the image?
                stretch:[600,186],
                coords:[0,158],
            }
        ]
    },
    {
        names:["16","16k"],
        img_name:"16k.png",
        effects:[
            { rotate:0,stretch:[169,94], coords:[324,19] }, 
            { rotate:0,stretch:[169,96], coords:[498,20]}, 
            { rotate:0,stretch:[171,98], coords:[670,18]}, 
            { rotate:0,stretch:[173,102], coords:[846,16]}, 
            { rotate:0,stretch:[169,94], coords:[324,120]}, 
            { rotate:0,stretch:[169,96], coords:[498,120]}, 
            { rotate:0,stretch:[171,98], coords:[670,120]}, 
            { rotate:0,stretch:[173,102], coords:[846,124]}, 
            { rotate:0,stretch:[169,94], coords:[324,223]}, 
            { rotate:0,stretch:[169,96], coords:[498,223]}, 
            { rotate:0,stretch:[171,98], coords:[670,223]}, 
            { rotate:0,stretch:[173,102], coords:[846,223]}, 
            { rotate:0,stretch:[169,94], coords:[324,325]}, 
            { rotate:0,stretch:[169,96], coords:[498,325]}, 
            { rotate:0,stretch:[171,98], coords:[668,325]}, 
            { rotate:0,stretch:[173,102], coords:[840,325]}
        ]
    }
];