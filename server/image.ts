export class AppError extends Error {constructor(public code:string,public status:number,public publicMessage:string){super(code);}}
export function inspectImage(data:Buffer,mime:string){
 let width=0,height=0;
 if(mime==='image/png'&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.length>=24){width=data.readUInt32BE(16);height=data.readUInt32BE(20);}
 else if(mime==='image/jpeg'&&data[0]===255&&data[1]===216){let offset=2;while(offset+4<=data.length){if(data[offset]!==255)break;const marker=data[offset+1];if(marker===217||marker===218)break;const length=data.readUInt16BE(offset+2);if(length<2||offset+length+2>data.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=7){height=data.readUInt16BE(offset+5);width=data.readUInt16BE(offset+7);break;}offset+=length+2;}}
 if(!width||!height)throw new AppError('INVALID_IMAGE',400,'Ảnh không hợp lệ hoặc MIME không khớp.');
 if(width*height>16000000||width>10000||height>10000)throw new AppError('IMAGE_TOO_LARGE',413,'Ảnh vượt giới hạn 16 megapixel.');
 return {width,height};
}
