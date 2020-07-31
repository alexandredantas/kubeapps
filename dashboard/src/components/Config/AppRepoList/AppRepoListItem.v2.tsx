import React, { useState } from "react";
import { Link } from "react-router-dom";

import { CdsButton, CdsIcon } from "components/Clarity/clarity";
import { useDispatch } from "react-redux";
import { IAppRepository, ISecret } from "shared/types";
import actions from "../../../actions";
import * as url from "../../../shared/url";
import ConfirmDialog from "../../ConfirmDialog/ConfirmDialog.v2";
import { AppRepoAddButton } from "./AppRepoButton.v2";

interface IAppRepoListItemProps {
  repo: IAppRepository;
  secret?: ISecret;
  renderNamespace: boolean;
  cluster: string;
  namespace: string;
  kubeappsNamespace: string;
}

export function AppRepoListItem({
  cluster,
  namespace,
  renderNamespace,
  repo,
  secret,
  kubeappsNamespace,
}: IAppRepoListItemProps) {
  const [modalIsOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);
  const dispatch = useDispatch();

  const handleDeleteClick = (repoName: string, repoNamespace: string) => {
    return () => {
      dispatch(actions.repos.deleteRepo(repoName, repoNamespace));
      closeModal();
    };
  };

  const handleResyncClick = (repoName: string, repoNamespace: string) => {
    return () => {
      dispatch(actions.repos.resyncRepo(repoName, repoNamespace));
    };
  };

  return (
    <tr key={repo.metadata.name}>
      <td>
        <Link to={url.app.repo(cluster, namespace, repo.metadata.name)}>{repo.metadata.name}</Link>
      </td>
      {renderNamespace && <td>{repo.metadata.namespace}</td>}
      <td>{repo.spec && repo.spec.url}</td>
      <td>
        <ConfirmDialog
          onConfirm={handleDeleteClick(repo.metadata.name, repo.metadata.namespace)}
          modalIsOpen={modalIsOpen}
          loading={false}
          closeModal={closeModal}
          confirmationText={`Are you sure you want to delete the repository ${repo.metadata.name}?`}
        />

        <CdsButton status="danger" onClick={openModal}>
          <CdsIcon shape="trash" inverse={true} /> Delete
        </CdsButton>

        <AppRepoAddButton
          namespace={namespace}
          kubeappsNamespace={kubeappsNamespace}
          text="Edit"
          repo={repo}
          secret={secret}
        />

        <CdsButton onClick={handleResyncClick(repo.metadata.name, repo.metadata.namespace)}>
          <CdsIcon shape="refresh" inverse={true} /> Refresh
        </CdsButton>
      </td>
    </tr>
  );
}
