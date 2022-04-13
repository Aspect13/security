class SectionDataProvider {
    static allowed_methods = ['get', 'set', 'clear', 'setError', 'clearErrors']

    constructor(name, actions) {
        this.name = name
        SectionDataProvider.allowed_methods.forEach(
            item => this[item] = actions[item] || SectionDataProvider.not_defined(name, item)
        )
    }

    static not_defined = (provider, method_name) => () => {
        console.warn(`Method ${method_name} is not defined for ${provider}`)
    }
    register = () => SecurityModal._instance ?
        SecurityModal._instance.registerDataProvider(this) :
        console.warn('SecurityModal instance not declared')
}

// SecurityModal is a singleton for a security modal with test creation functionality.
// to add a new section register it with help of SectionDataProvider(...).register()
class SecurityModal {
    static _instance = null
    test_uid = null
    dataModel = {}

    constructor(containerId) {
        if (SecurityModal._instance) {
            return SecurityModal._instance
        }
        this.containerId = containerId
        this.refreshContainer()
        SecurityModal._instance = this
        this.registerDataProvider(new SectionDataProvider('name', {
            get: () => $('#test_name').val(),
            set: value => $('#test_name').val(value),
            clear: () => $('#test_name').val(''),
            setError: data => $('#test_name').addClass('is-invalid').next('div.invalid-feedback').text(data.msg),
            clearErrors: () => $('#test_name').removeClass('is-invalid')
        }))
        this.registerDataProvider(new SectionDataProvider('description', {
            get: () => $('#test_description').val(),
            set: value => $('#test_description').val(value),
            clear: () => $('#test_description').val(''),
        }))
        this.registerDataProvider(new SectionDataProvider('test_parameters', {
            get: () => $('#security_test_params').bootstrapTable('getData'),
            set: (urls_to_scan, urls_exclusions, scan_location, test_parameters = []) => {
                console.log('SET PARAMETERS', urls_to_scan, urls_exclusions, scan_location, test_parameters)
                const table_data = [
                    {
                        default: urls_to_scan.join(','),
                        description: "Data",
                        name: "URL to scan",
                        type: "List",
                        _description_class: "disabled",
                        _name_class: "disabled",
                        _type_class: "disabled",
                    },
                    {
                        default: urls_exclusions?.join(','),
                        description: "Data",
                        name: "Exclusions",
                        type: "List",
                        _description_class: "disabled",
                        _name_class: "disabled",
                        _type_class: "disabled",
                    },
                    {
                        default: scan_location,
                        description: "Data",
                        name: "Scan location",
                        type: "String",
                        _description_class: "disabled",
                        _name_class: "disabled",
                        _type_class: "disabled",
                    },
                    ...test_parameters.filter(item => !['url to scan', 'exclusions', 'scan location'].includes(item.name))
                ]
                $('#security_test_params').bootstrapTable('load', table_data)
            },
            clear: () => {
                console.log('CLEARING TEST PARAMS TABLE')
                const table_data = [
                    {
                        default: '',
                        description: "Data",
                        name: "URL to scan",
                        type: "String",
                        _description_class: "disabled",
                        _name_class: "disabled",
                        _type_class: "disabled",
                    },
                    {
                        default: '',
                        description: "Data",
                        name: "Exclusions",
                        type: "List",
                        _description_class: "disabled",
                        _name_class: "disabled",
                        _type_class: "disabled",
                    },
                    {
                        default: '',
                        description: "Data",
                        name: "Scan location",
                        type: "String",
                        _description_class: "disabled",
                        _name_class: "disabled",
                        _type_class: "disabled",
                    }
                ]
                $('#security_test_params').bootstrapTable('load', table_data)
            },
            setError: data => {
                console.log('tp set error', data)
                const get_col_by_name = name => $(`#security_test_params thead th[data-field=${name}]`).index()
                const [_, row, col_name] = data.loc
                $(`#security_test_params tr[data-index=${row}] td:nth-child(${get_col_by_name(col_name) + 1}) input`)
                    .addClass('is-invalid')
                    .next('div.invalid-tooltip-custom')
                    .text(data.msg)

            },
            clearErrors: () => $('#security_test_params').removeClass('is-invalid')
        }))
        this.registerDataProvider(new SectionDataProvider('alert_bar', {
            clear: () => alertCreateTest?.clear(),
            setError: data => alertCreateTest?.add(data.msg, 'dark-overlay', true)
        }))
    }

    refreshContainer = () => {
        this.container = $(`#${this.containerId}`)
        this.container.on('hide.bs.modal', this.clear)
        this.container.on('hide.bs.modal', () => console.log('CLOSED'))
    }

    registerDataProvider = provider => this.dataModel[provider.name] = provider

    setData = data => {
        console.log('setModalData', data)
        const {
            urls_to_scan, urls_exclusions, scan_location, test_parameters,
            test_uid,
            ...rest
        } = data
        this.test_uid = test_uid
        Object.entries(rest).forEach(([k, v]) => this.dataModel[k]?.set(v))
        this.dataModel.test_parameters?.set(urls_to_scan, urls_exclusions, scan_location, test_parameters)

    }
    clear = () => {
        Object.keys(this.dataModel).forEach(item => {
            this.dataModel[item].clear()
        })
        $('#modal_title').text('Add Application Test')
        $('#security_test_save').text('Save')
        $('#security_test_save_and_run').text('Save And Start')
        this.test_uid = null
        this.clearErrors()
    }
    collectData = () => {
        let data = {}
        Object.entries(this.dataModel).forEach(([k, v]) => {
            data[k] = v.get()
        })
        return data
    }

    setValidationErrors = errorData => {
        errorData?.forEach(item => {
            const [errLoc, ...rest] = item.loc
            item.loc = rest
            this.dataModel[errLoc]?.setError(item)
        })
        alertCreateTest?.add('Please fix errors below', 'danger', true, 5000)
    }

    clearErrors = () => {
        // this.container.find('input.is-invalid').removeClass('is-invalid')
        // this.container.find('.invalid-feedback').text('')
        // this.container.find('.invalid-tooltip').text('')
        Object.keys(this.dataModel).forEach(item => this.dataModel[item].clearErrors())
    }

    handleSave = () => {
        const data = this.collectData()
        if (!this.test_uid) {
            console.log('Creating test with data', data)
            apiActions.create(data)
        } else {
            console.log('Editing test with data', data)
            apiActions.edit(this.test_uid, data)
        }

    }
    handleSaveAndRun = () => {
        const data = this.collectData()
        if (!this.test_uid) {
            console.log('Creating and running test with data', data)
            apiActions.createAndRun(data)
        } else {
            console.log('Editing and running test with data', data)
            apiActions.editAndRun(this.test_uid, data)
        }
    }

}

let securityModal = new SecurityModal('createApplicationTest')
// wait_for('vueVm').then(() => {
//     securityModal.refreshContainer()
// })



var tableFormatters = {
    reports_test_name_button(value, row, index) {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('module', 'Result');
        searchParams.set('page', 'list');
        searchParams.set('project_id', getSelectedProjectId());
        searchParams.set('result_test_id', row.id);
        searchParams.set('test_id', row.test_id);
        return `<a class="test form-control-label" href="?${searchParams.toString()}" role="button">${row.name}</a>`
    },
    reports_status_formatter(value, row, index) {
        switch (value.toLowerCase()) {
            case 'error':
            case 'failed':
                return `<div style="color: var(--red)">${value} <i class="fas fa-exclamation-circle error"></i></div>`
            case 'stopped':
                return `<div style="color: var(--yellow)">${value} <i class="fas fa-exclamation-triangle"></i></div>`
            case 'aborted':
                return `<div style="color: var(--gray)">${value} <i class="fas fa-times-circle"></i></div>`
            case 'finished':
                return `<div style="color: var(--info)">${value} <i class="fas fa-check-circle"></i></div>`
            case 'passed':
                return `<div style="color: var(--green)">${value} <i class="fas fa-check-circle"></i></div>`
            case 'pending...':
                return `<div style="color: var(--basic)">${value} <i class="fas fa-spinner fa-spin fa-secondary"></i></div>`
            default:
                return value
        }
    },
    tests_actions(value, row, index) {
        return `
            <div class="d-flex justify-content-end">
                <button type="button" class="btn btn-24 btn-action run"><i class="fas fa-play"></i></button>
                <div class="dropdown action-menu">
                    <button type="button" class="btn btn-24 btn-action" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-menu bulkActions" aria-labelledby="bulkActionsBtn">
                        <a class="dropdown-item submenu" href="#"><i class="fas fa-share-alt fa-secondary fa-xs"></i> Integrate with</a>
                        <div class="dropdown-menu">
                            <a class="dropdown-item" href="#" onclick="console.log('Docker command')">Docker command</a>
                            <a class="dropdown-item" href="#" onclick="console.log('Jenkins stage')">Jenkins stage</a>
                            <a class="dropdown-item" href="#" onclick="console.log('Azure DevOps yaml')">Azure DevOps yaml</a>
                            <a class="dropdown-item" href="#" onclick="console.log('Test UID')">Test UID</a>
                        </div>
                        <a class="dropdown-item settings" href="#"><i class="fas fa-cog fa-secondary fa-xs"></i> Settings</a>
                        <a class="dropdown-item trash" href="#"><i class="fas fa-trash-alt fa-secondary fa-xs"></i> Delete</a>
                    </div>
                </div>
            </div>
        `
    },
    tests_tools(value, row, index) {
        // todo: fix
        return Object.keys(value?.scanners || {})
    },
    status_events: {
        "click .run": function (e, value, row, index) {
            apiActions.run(row.id, row.name)
        },

        "click .settings": function (e, value, row, index) {
            securityModal.setData(row)
            securityModal.container.modal('show')
            $('#modal_title').text('Edit Application Test')
            $('#security_test_save').text('Update')
            $('#security_test_save_and_run').text('Update And Start')

        },

        "click .trash": function (e, value, row, index) {
            apiActions.delete(row.id)
        }
    }
}

const apiActions = {
    run: (id, name) => {
        console.log('Run test', id)
        fetch(`/api/v1/security/${getSelectedProjectId()}/dast/${id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({'test_name': name})
        }).then(response => response.ok && apiActions.afterSave())
    },
    delete: id => {

        const url = `/api/v1/security/${getSelectedProjectId()}/dast?` + $.param({"id[]": id})
        console.log('Delete test with id', id, url);
        fetch(url, {
            method: 'DELETE'
        }).then(response => response.ok && apiActions.afterSave())
    },
    edit: (testUID, data) => {
        apiActions.beforeSave()
        fetch(`/api/v1/security/${getSelectedProjectId()}/dast/${testUID}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(response => {
            apiActions.afterSave()
            if (response.ok) {
                securityModal.container.modal('hide');
            } else {
                response.json().then(data => securityModal.setValidationErrors(data))
            }
        })
    },
    editAndRun: (testUID, data) => {
        data['run_test'] = true
        return apiActions.edit(testUID, data)
    },
    create: data => {
        apiActions.beforeSave()
        fetch(`/api/v1/security/${getSelectedProjectId()}/dast`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(response => {
            apiActions.afterSave()
            if (response.ok) {
                $("#createApplicationTest").modal('hide');
            } else {
                response.json().then(data => securityModal.setValidationErrors(data))
            }
        })
    },
    createAndRun: data => {
        data['run_test'] = true
        return apiActions.create(data)
    },
    beforeSave: () => {
        $("#security_test_save").addClass("disabled updating")
        $("#security_test_save_and_run").addClass("disabled updating")
        securityModal.clearErrors()
        alertCreateTest?.clear()
    },
    afterSave: () => {
        $("#tests-list").bootstrapTable('refresh')
        $("#results-list").bootstrapTable('refresh')
        $("#security_test_save").removeClass("disabled updating")
        $("#security_test_save_and_run").removeClass("disabled updating")
    },


}


$(document).on('vue_init', () => {
    securityModal.refreshContainer()
    $('#security_test_save').on('click', securityModal.handleSave)
    $('#security_test_save_and_run').on('click', securityModal.handleSaveAndRun)
    $('#delete_test').on('click', e => {
        console.log('e', $(e.target).closest('.card').find('table.table'))
        const ids_to_delete = $(e.target).closest('.card').find('table.table').bootstrapTable('getSelections').map(
            item => item.id
        ).join(',')
        ids_to_delete && apiActions.delete(ids_to_delete)
    })
})
