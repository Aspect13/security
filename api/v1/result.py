from flask import make_response
from flask_restful import Resource

from ...models.security_results import SecurityResultsDAST


class API(Resource):
    def __init__(self, module):
        self.module = module

    def get(self, project_id: int, result_id: int):
        obj = SecurityResultsDAST.query.filter(
            SecurityResultsDAST.project_id == project_id,
            SecurityResultsDAST.id == result_id,
        ).one()
        return make_response(obj.to_json(), 200)
