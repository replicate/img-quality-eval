from django.core.signing import Signer

signer = Signer()


def encrypt_key(key: str) -> str:
    return signer.sign(key)


def decrypt_key(encrypted_key: str) -> str:
    return signer.unsign(encrypted_key)
