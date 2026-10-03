from app.documents import DOCUMENTS, variable_names


def test_catalog_folds_nda_cover_page_into_one_document():
    assert len(DOCUMENTS) == 11
    nda = DOCUMENTS["mutual-nda"]
    assert nda.name == "Mutual Non-Disclosure Agreement"
    assert nda.parties == ["Party 1", "Party 2"]
    assert nda.variables[0] == "Purpose"
    assert "MNDA Modifications" in nda.variables


def test_party_roles_are_separated_from_variables():
    csa = DOCUMENTS["csa"]
    assert csa.parties == ["Provider", "Customer"]
    assert "Provider" not in csa.variables
    assert "Subscription Period" in csa.variables
    assert csa.body.startswith("# Cloud Service Agreement")


def test_every_document_has_two_parties_and_variables():
    for document in DOCUMENTS.values():
        assert len(document.parties) == 2, document.id
        assert document.variables, document.id


def test_variable_names_strip_possessives_and_plurals():
    markdown = (
        '<span class="coverpage_link">Provider’s</span> <span class="keyterms_link">Covered Claim</span> '
        '<span class="keyterms_link">Covered Claims</span> <span class="orderform_link">Fees</span> '
        '<span class="coverpage_link">Provider</span> <span class="header_2">Heading</span>'
    )
    assert variable_names(markdown) == ["Provider", "Covered Claim", "Fees"]
