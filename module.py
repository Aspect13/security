#!/usr/bin/python3
# coding=utf-8

#   Copyright 2021 getcarrier.io
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.

""" Module """
from flask import render_template, redirect, url_for
from pylon.core.tools import log, web  # pylint: disable=E0611,E0401
from pylon.core.tools import module  # pylint: disable=E0611,E0401


from .api.security_results_api import SecurityTestResultApi
from .api.tests import SecurityTestsRerun, SecurityTestsApi
from .api.test import SecurityTestApi
from .api.security_results_api import SecurityResultsApi
from .api.security_dispatcher import SecuritySeedDispatcher
from .api.security_findings_api import FindingsAPI
from .api.update_test_status import TestStatusUpdater
from .api.get_loki_url import GetLokiUrl
from .api.security_report_api import SecurityReportAPI
from .init_db import init_db
from .rpc import security_results_or_404, get_overview_data, parse_test_parameters, parse_common_test_parameters, \
    run_scheduled_test

from ..shared.utils.api_utils import add_resource_to_api
from ..shared.connectors.auth import SessionProject
from ..shared.utils.render import render_template_base


class Module(module.ModuleModel):
    """ Task module """

    def __init__(self, context, descriptor):
        self.context = context
        self.descriptor = descriptor

    def init(self):
        """ Init module """
        log.info(f'Initializing module {self.descriptor.name}')
        init_db()

        self.descriptor.init_blueprint()

        self.init_rpc()
        self.init_api()
        self.init_slots()

    def init_rpc(self):
        self.context.rpc_manager.register_function(
            security_results_or_404, name='security_results_or_404')
        # self.context.rpc_manager.register_function(
        #     get_overview_data, name='security_overview_data')
        self.context.rpc_manager.register_function(
            parse_test_parameters, name='security_test_create_test_parameters')
        self.context.rpc_manager.register_function(
            parse_common_test_parameters, name='security_test_create_common_parameters')
        self.context.rpc_manager.register_function(
            run_scheduled_test, name='security_run_scheduled_test')

    def init_api(self):
        add_resource_to_api(
            self.context.api, GetLokiUrl,
            "/security/<int:project_id>/get_url",
            resource_class_kwargs={"settings": self.descriptor.config}
        )
        add_resource_to_api(
            self.context.api,
            SecurityTestsApi,
            "/security/<int:project_id>/dast"
        )
        add_resource_to_api(
            self.context.api, SecurityTestApi,
            "/security/<int:project_id>/dast/<int:test_id>",
            "/security/<int:project_id>/dast/<string:test_id>"
        )
        add_resource_to_api(
            self.context.api, SecurityResultsApi,
            "/security/<int:project_id>/dast/results"
        )
        add_resource_to_api(
            self.context.api, SecuritySeedDispatcher,
            "/tests/<int:project_id>/security/<string:seed>"
        )
        add_resource_to_api(
            self.context.api, FindingsAPI,
            "/security/<int:project_id>/findings/<int:test_id>",
            "/security/<int:project_id>/finding"
        )
        add_resource_to_api(
            self.context.api, TestStatusUpdater,
            "/security/<int:project_id>/update_status/<int:test_id>",
            "/security/<int:project_id>/update_status/<string:test_id>"
        )
        add_resource_to_api(
            self.context.api, SecurityReportAPI,
            "/security/<int:project_id>"
        )
        add_resource_to_api(
            self.context.api, SecurityTestsRerun,
            "/security/rerun/<int:security_results_dast_id>"
        )
        add_resource_to_api(
            self.context.api, SecurityTestResultApi,
            "/security/<int:project_id>/dast/results/<int:result_id>"
        )

    def init_slots(self):
        # self.context.slot_manager.register_callback("security_findings_table", result_findings)
        # self.context.slot_manager.register_callback("security_artifacts_table", result_artifacts)
        # self.context.slot_manager.register_callback("security_logs_list", tests_logs)
        # self.context.slot_manager.register_callback("security_results_show_config", security_results_show_config)
        # self.context.slot_manager.register_callback("security_overview", render_overview)
        # self.context.slot_manager.register_callback("create_test_processing", create_test_processing)
        # self.context.slot_manager.register_callback("test_result_page", test_result_page)
        ...

    def deinit(self):  # pylint: disable=R0201
        """ De-init module """
        log.info(f'De-initializing module {self.descriptor.name}')

    @web.route('/overview')
    def overview(self):
        project_id = SessionProject.get()
        overview_data = get_overview_data(project_id)
        # payload['overview_data'] = overview_data
        return render_template_base(
            'security:overview.html',
            project_id=project_id,
            overview_data=overview_data
            # config=payload
        )
        # return render_template(
        #     'theme:base.html',
        #     page_content=page_content
        # )

    @web.route('/app')
    def app(self):
        project_id = SessionProject.get()
        project_config = self.context.rpc_manager.call.project_get_or_404(project_id=project_id).to_json()
        return render_template_base(
            'security:app.html',
            config=project_config
        )
        # return render_template(
        #     'theme:base.html',
        #     page_content=page_content
        # )

    @web.route('/')
    def index(self):
        return redirect(url_for('security.overview'))


