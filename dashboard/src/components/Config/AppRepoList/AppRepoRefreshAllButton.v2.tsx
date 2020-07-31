import * as React from "react";

import actions from "actions";
import { CdsButton, CdsIcon } from "components/Clarity/clarity";
import { useDispatch, useSelector } from "react-redux";
import { IStoreState } from "shared/types";

export function AppRepoRefreshAllButton() {
  const { repos } = useSelector((state: IStoreState) => state.repos);
  const dispatch = useDispatch();

  const handleResyncAllClick = async () => {
    if (repos) {
      const repoObjects = repos.map(repo => {
        return {
          name: repo.metadata.name,
          namespace: repo.metadata.namespace,
        };
      });
      dispatch(actions.repos.resyncAllRepos(repoObjects));
    }
  };
  return (
    <div className="refresh-all-button">
      <CdsButton action="outline" onClick={handleResyncAllClick}>
        <CdsIcon shape="refresh" inverse={true} /> Refresh All
      </CdsButton>
    </div>
  );
}
