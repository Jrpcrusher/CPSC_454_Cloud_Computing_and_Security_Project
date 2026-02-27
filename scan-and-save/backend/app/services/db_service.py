from fastapi import Body, Request, Response, HTTPException, status
from fastapi.encoders import jsonable_encoder
from typing import List

def get_all_users(request: Request):
    users = list(request.app.database["users"].find())
    return users