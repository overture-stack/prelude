import Cryptr from 'cryptr';
import { getConfig } from '../config';

const { ACCESSTOKEN_ENCRYPTION_SECRET } = getConfig();

const cryptr = new Cryptr(ACCESSTOKEN_ENCRYPTION_SECRET);

export const encryptContent = (value: string) => {
	return cryptr.encrypt(value);
};

export const decryptContent = (encryptedValue: string) => {
	return cryptr.decrypt(encryptedValue);
};
