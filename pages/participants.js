import { app, h } from "hyperapp";
import "./participants.css";

const ParticipantRow = (participant) => (
  <tr class="participant">
    <td scope="row" class="text-center">
      <img
        class="img-avatar img-thumbnail"
        src={"https://robohash.org/" + participant.address}
      ></img>
    </td>
    <td scope="row" class="align-middle">
      {participant.fullname}
    </td>
    <td scope="row" class="align-middle">
      {participant.email}
    </td>
    <td scope="row" class="align-middle text-center">
      {participant.nSessions}
    </td>
    <td scope="row" class="align-middle text-center">
      {participant.deviation / 100} %
    </td>
    <td scope="row" class="align-middle text-center">
      <code>{participant.address}</code>
    </td>
  </tr>
);
const Participants =
  ({ match }) =>
  ({ participants }) =>
    (
      <div class="d-flex w-100 h-100 bg-white">
        <div class="products-list">
          <table class="table table-hover table-striped">
            <thead>
              <tr>
                <th scope="col" class="text-center">
                  Avatar
                </th>
                <th scope="col">Fullname</th>
                <th scope="col">Email</th>
                <th scope="col" class="text-center">
                  Number of sessions
                </th>
                <th scope="col" class="text-center">
                  Deviation
                </th>
                <th scope="col" class="text-center">
                  Address
                </th>
              </tr>
            </thead>
            <tbody>
              {(participants || []).map((p, i) => {
                p.no = i + 1;
                return ParticipantRow(p);
              })}
            </tbody>
          </table>
        </div>
        {/* <div class='p-2 flex product-detail'></div> */}
      </div>
    );

export { Participants };
