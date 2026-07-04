from __future__ import annotations

from app.core.security import decode_token


async def test_register_then_login(client):
    email = "user@example.com"
    password = "very-secure-password"

    reg = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "role": "owner"},
    )
    assert reg.status_code == 200, reg.text
    reg_token = reg.json()["access_token"]
    assert decode_token(reg_token) is not None

    login = await client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    login_token = login.json()["access_token"]
    assert decode_token(login_token) is not None
