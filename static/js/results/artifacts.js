// page_params = page_params || new URLSearchParams(location.search);

const getTableUrlArtifacts = () => `/api/v1/artifacts/security_results/${result_test_id}/`
const getTableUrlDownloadArtifacts = () => `/api/v1/artifacts/security_download/${result_test_id}`

function renderTableArtifacts() {
    $("#artifacts").bootstrapTable('refresh', {
        url: getTableUrlArtifacts(),
    })
}

function artifactActionsFormatter(value, row, index) {return _artifactActionsFormatter(value, row, index)}

const _artifactActionsFormatter = (value, row, index) => {
    return `<a href="${getTableUrlDownloadArtifacts()}/${row['name']}" class="fa fa-download btn-action fa-2x" download="${row['name']}"></a>`
}

$.when( $.ready ).then(function() {
  renderTableArtifacts()
});
