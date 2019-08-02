const Jimp = require('jimp');
const {Attachment} = require('discord.js')
const {stripIndents} = require('common-tags')
let logger;
exports.init = (client,_logger) => {
    logger = _logger;
}
exports.run = async(client,msg,args,flags,logger) => {
    try {
        if(args[0].toLowerCase() === "help") {
            return msg.channel.send(stripIndents`
            **__Zeko Image Editing__**
            To add an image either upload attachment with the command args, put a url as the last argument,
            or use the \`--last\` flag anywhere to use the newest image from the last 10 messages

            Example: \`${client.prefix}image blur [optional: #pixels] https://cdn.jackz.me/img/steve.jpg\`

            **Type \`${client.prefix}image commands\` for list of actions**`)
        }else if (args[0].toLowerCase() === "commands" || args[0].toLowerCase() === "cmds") {
            return msg.channel.sendMessage(stripIndents
                `**__Commands__** (**[] Optional** | **<> Required**)
                \`blur [# pixels]\`
                \`pixelate [# pixel size]\` - pixelate the item
                \`brightness [+1 to -1 float OR -100 to +100 int]\`
                \`contrast [+1 to -1 float OR -100 to +100 int]\`
                \`resize <# width> <# height>\`
                \`opaque\`
                \`normalize\`
                \`grayscale/greyscale\`
                \`autocrop\` - automatically crop same-color borders from image
                \`invert\` - inverts the colors of image
                \`scale <# factor>\` scale the image by a factor
                \`scalefit <# width> <# height>\` - scale image to largest size that fits width/height
                \`cover <# width> <# height>\` - scale to width/height, may be cropped
                \`mirror <y/x>\` - flip/mirror image on Y or X axis
                \`rotate <# degrees>\`
                \`dither565\` -  ordered dithering of the image and reduce color space to 16-bits
                \`posterize [# level]\``
                //\`shadow [# size] [# blur level]\` - create a shadow with X size, Y blur`
            )
        }

        //last space argument
        const image = await getImage(msg,args[args.length-1],flags.last)
        if(!image && !findLast) return msg.channel.send("**Please upload an image or attach an url to an image.**")
        if(!image && findLast) return msg.channel.send("**Could not find any valid images to use.** ")

        const m = await msg.channel.send(`**⏳ Processing your request...**`);
        switch(args[0].toLowerCase()) {
            case "invert":
                await image.invert();
                sendImage(image,m);
                break;
            case "posterize":
                await image.posterize( getNumber(args[1],5,0) );
                sendImage(image,m);
                break;
            case "blur": {
                const amount = getNumber(args[1],50,0);
                await image.blur( amount )
                sendImage(image,m);
                
                break;
            }
            // case "shadow": {
            //     const size = getNumber(args[1],null);
            //     const blur = getNumber(args[2],null);
            //     await image.shadow({size,blur});
            //     sendImage(image,m);
            //     break;
            // }
            case "dither":
            case "dither565":
                await image.dither565();
                sendImage(image,m);
                break;
            case "greyscale":
            case "grayscale":
            case "gray": {
                await image.greyscale();
                sendImage(image,m)
                break;
            } 
            case "normalize": {
                await image.greyscale();
                sendImage(image,m)
                break;
            } 
            case "opaque": {
                await image.greyscale();
                sendImage(image,m)
                break;
            } 
            case "rotate": {
                await image.rotate( getNumber(args[1],90))
                sendImage(image,m)
                break;
            }
            case "quality":
            case "jpeg": {
                await image.quality( getNumber(args[1],30,0) )
                sendImage(image,m);
                break;
            }
            case "cover": {
                if(args.length < 3) return m.edit("**Missing arguments:** <# width> <# height>")
                const width = parseInt(args[1]);
                const height = parseInt(args[2]);
                if(isNaN(width) || isNaN(height)) return m.edit("Width or height is not a number.");
                await image.cover(width,height);
                sendImage(image,m)
                break;
            }
            case "scaletofit":
            case "scale2fit":
            case "scalefit": {
                if(args.length < 3) return m.edit("**Missing arguments:** <# width> <# height>")
                const width = parseInt(args[1]);
                const height = parseInt(args[2]);
                if(isNaN(width) || isNaN(height)) return m.edit("Width or height is not a number.");
                await image.scaleToFit(width,height);
                sendImage(image,m)
                break;
            }
            case "mirror":
            case "flip": {
                let y_axis;
                if(args[1].toLowerCase().includes("y") || args[1].toLowerCase().includes("horizontal")) {
                    y_axis = true;
                }else if(args[1].toLowerCase().includes("x") || args[1].toLowerCase().includes("vertical")) {
                    y_axis = false;
                }else{
                    return m.edit("Please specify which axis (")
                }
                //.flip(horizontal,vertical)
                await image.flip(y_axis,!y_axis);
                sendImage(image,m)
                break;
            }
            case "brighten": 
            case "brightness": {
                await image.brightness( getFloat(args[1],0.5) )
                sendImage(image,m);
                break;
            } 
            case "contrast": {
                await image.contrast( getFloat(args[1],0.5) )
                sendImage(image,m);
                break;    
            }
            case "resize": {
                if(args.length < 3) return m.edit("**Missing arguments:** <# width> <# height>")
                const width = parseInt(args[1]);
                const height = parseInt(args[2]);
                if(isNaN(width) || isNaN(height)) return m.edit("Width or height is not a number.");
                await image.resize(width,height);
                sendImage(image,m)
                break;
            } 
            case "autocrop": {
                await image.autocrop()
                sendImage(image,m);
                
                break;
            } 
            case "pixelate":
                await image.pixelate( getNumber(args[1],50,0) )
                sendImage(image,m);
                
                break;
            default:
                m.edit("Unknown option, use `img help` for a list of options")
        }
    }catch(err) {
        logger.error("catchAll:",err.message)
        msg.channel.send("⚠ **An Error Ocurred**\n"+err.message)
    }
};

exports.config = {
    usageIfNotSet: true,
    flags:{
        last:{
            type:Boolean,
            description:'Grabs the last image instead of url/attachment'
        }
    }
};

exports.help = {
	name: ['image','img','i'],
	description: 'Image Editing and Modifications',
	usage:'img help'
};
function getNumber(text,default_amount = 0.90,min_amount = null) {
    let amount = parseInt(text);
    //amount = parseFloat(amount / 100);
    if(!amount || isNaN(amount)) return default_amount;
    if(min_amount && default_amount <= min_amount) return default_amount;
    return amount;
}
function getFloat(text,default_amount = .5) {
    //if in > 1 -> divide by 100 to get float
    let integer = parseInt(text);
    if(!isNaN(integer)) return default_amount;
    let float;
    if(integer > 1 || integer < 1) {
        if(integer > 100 || integer < 100) return default_amount;
        float = integer / 100;
    }else{
        float = parseFloat(float);
        if(isNaN(float)) return default_amount;
    }
    return float;
}

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