#!/usr/bin/env node

const { Image } = require('image-js'),
	fs = require('fs'),
	binaryDelimiter = '111111111111111111111110';

const rgb2Hex = (r, g, b) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
const hex2Rgb = (hex) => hex.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16));
const str2Bin = (str) => str.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
const bin2Str = (bin) => bin.match(/.{8}/g).map(b => String.fromCharCode(parseInt(b, 2))).join('');

const encode = (hexcode, digit) => ['0', '1', '2', '3', '4', '5'].includes(hexcode[hexcode.length - 1]) 
	? hexcode.substr(0, hexcode.length - 1) + digit : '';
const decode = (hexcode) => ['0', '1'].includes(hexcode[hexcode.length - 1]) 
	? hexcode[hexcode.length - 1] : '';

const inject = async (filename, message, saveAs) => {
	const file = await Image.load(filename);
	const binaryMsg = `${str2Bin(message)}${binaryDelimiter}`;
	if (file.colorModel === 'RGB') {
		let digit = 0;
		for (let i = 0; i < file.sizes[0] * file.sizes[1]; i++){
			const data = file.getPixel(i);
			if (digit < binaryMsg.length) {
				const encoded = encode(rgb2Hex(...data), binaryMsg[digit]);
				if (encoded !== undefined) {
					file.setPixel(i, [...hex2Rgb(encoded), 255]);
					digit++;
				}
			} else {
				break;
			}
		}
		await file.save(saveAs);
	}
};

const extract = async (filename) => {
	const file = await Image.load(filename);
	if (file.colorModel === 'RGB') {
		let binary = '';
		for (let i = 0; i < file.sizes[0] * file.sizes[1]; i++){
			const data = file.getPixel(i);
			if (!binary.endsWith(binaryDelimiter))
				binary += decode(rgb2Hex(...data));
			else 
				return bin2Str(binary.substr(0, binary.length - binaryDelimiter.length));
		}
	}
	return null;
};

const showHelp = () => {
	console.log('Extract: steganosaurjs extract [source]');
	console.log('Inject: steganosaurjs inject [source] [message] [target]');
};

const main = async (args) => {
	const mode = args.shift(),
		path = args.shift();

	if (!mode)
		return showHelp();

	try{
		await fs.promises.access(path);
	} catch {
		return console.log('File does not exist.');
	}

	switch(mode) {
		case 'inject':
			const message = args.shift();
			if (!message) 
				return console.log('No message specified.');
			const saveAs = args.shift();
				if (!saveAs) 
					return console.log('No output path specified.');
			await inject(path, message, saveAs);
			break;
		case 'extract':
			const res = await extract(path);
			if (res)
				console.log(`Extracted message: ${res}`);
			else
				console.log('Could not extract a message from the image.');
			break;
		default:
			showHelp();
			break;
	}
};

main(process.argv.splice(2));