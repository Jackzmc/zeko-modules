const vision = require('@google-cloud/vision');
const got = require('got')
const visionClient = new vision.ImageAnnotatorClient();

module.exports = {
    async run(client,msg,args,flags,logger) {
        if(!process.env.GOOGLE_APPLICATION_CREDENTIALS) return m.edit("Missing env variable `GOOGLE_APPLICATION_CREDENTIALS`")
        const possibleUrl = args.join(" ");
        if(msg.attachments.size === 0 && !possibleUrl) return m.edit('Please upload an image or attach a url with the command');
        if(msg.attachments.size > 0 && !msg.attachments.first().height) return m.edit('Please upload an image or put an url.');
        const attachment_url = (msg.attachments.size > 0) ? msg.attachments.first().url : possibleUrl;
        //

        const m = await msg.channel.send(`⏳ **Please wait, waiting for Google Vision to process image**`)
        got(attachment_url,{encoding:null})
        .then(async(res) => {
            //resp.setEncoding('base64');
            //body = "data:" + resp.headers["content-type"] + ";base64,";
            try {
                //const image = Buffer.from(body).toString('base64').replace(/(\r\n|\n|\r)/gm,"")
                const [result] = await visionClient.textDetection({image:{content:res.body}});
                const detections = result.textAnnotations;
                if(result.error) return m.edit("❌ Could not detect text: " + result.error.message)

                if(detections.length == 0) {
                    m.edit("**No Results Found**")
                }else{
                    const text = detections[0].description;
                    if(text.length > 2035) {
                        m.edit("**⏳ Result length is too long. Generating pastebin... **")
                        if(process.env.PASTEE_API_KEY) {
                            got('https://api.paste.ee/v1/pastes',{post:true,json:true,headers:{
                                'X-Auth-Token': process.env.PASTEE_API_KEY
                            },body:{
                                sections:[
                                    {
                                        contents:text
                                    }
                                ]
                            }}).then(r => {
                                m.edit('**Result**\n' + r.body.link)
                            }).catch(err => {
                                m.edit("❌ Could not post to pastebin " + err.message)
                            })
                        }else{
                            m.edit("**Could not post to a pastebin:** Missing `PASTEE_API_KEY`")
                        }
                    }else{
                        m.edit("**Result**\n"+text)
                    }
                }
            } catch(err) {
                //slice incase error message contains buffer/base64/whatever
                m.edit("❌ Could not parse image. " + err.message.slice(0,200))
            }
                //return res.json({result: body, status: 'success'});
        }).catch(err => {
            //slice incase error message contains buffer/base64/whatever
            m.edit("❌ Could not load image. " + err.message.slice(0,2048))
            
        })
    },
    config:{
        usageIfNotSet: false
    },
    help:{
        name: ['ocr'],
        description: 'Optical Character Recognition',
        usage:'ocr help'
    }
}
