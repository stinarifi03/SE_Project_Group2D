from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from datetime import timedelta
from models.db import init_schema
from utils.authz import token_is_revoked

load_dotenv()

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_IDENTITY_CLAIM'] = 'sub'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=30)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)

CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

jwt = JWTManager(app)


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload.get('jti')
    if not jti:
        return False
    return token_is_revoked(jti)


init_schema()

from routes.auth import auth_bp
from routes.reports import reports_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

@app.route('/health')
def health():
    return {'status': 'OK'}

if __name__ == '__main__':
    app.run(debug=True, port=8000)